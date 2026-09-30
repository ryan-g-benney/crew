export const meta = {
  name: 'wave',
  description: 'crew build: one wave - builders in worktrees (big blocks split recursively), merge, judge, simplifier, re-judge',
  phases: [{ title: 'Build' }, { title: 'Merge' }, { title: 'Judge' }, { title: 'Simplify' }],
}

// args = { feature: 'rate-limit', wave: 1, blocks: ['keystore', 'limiter', 'middleware'] }
const { feature, wave, blocks } = args
const MAX_DEPTH = 2   // a block may split into parts and a part once more; after that it must be built
const list = { type: 'array', items: { type: 'string' } }
const REPORT = { type: 'object', required: ['block', 'status', 'branch', 'parts', 'icrs'],
  properties: { block: { type: 'string' }, status: { type: 'string', enum: ['built', 'split'] },
    branch: { type: 'string' }, parts: list, icrs: list } }
const MERGED = { type: 'object', required: ['ok', 'merged', 'conflicts', 'locked'],
  properties: { ok: { type: 'boolean' }, merged: list, conflicts: list, locked: list } }
const VERDICT = { type: 'object', required: ['green', 'report'],
  properties: { green: { type: 'boolean' }, report: { type: 'string' } } }

const worker = (role, block, task) => agent(`${task}\nFeature: ${feature}. Block: ${block}. Wave: ${wave}.`,
  { label: `${role}: ${block}`, agentType: `crew:${role}`, isolation: 'worktree', schema: REPORT })
const merge = (reports) => agent(
  `Run \`crew merge-wave -f ${feature} ${reports.map(r => r.branch).join(' ')}\` and return the JSON it prints.`,
  { label: 'merge', model: 'haiku', effort: 'low', schema: MERGED })
const judge = () => agent(`Judge wave ${wave} of feature ${feature}.`,
  { label: 'judge', agentType: 'crew:judge', schema: VERDICT })

// The same build step, applied recursively: a block too big for one agent comes back as parts
// (registered with `crew split`), and every part goes through this step in parallel.
const build = async (block, depth) => {
  const r = await worker('builder', block, `Build your block. Depth: ${depth}.` +
    (depth >= MAX_DEPTH ? ' Splitting is not allowed at this depth: build it.' : ''))
  if (r?.status !== 'split' || !r.parts.length) return r ? [r] : []
  log(`${block} split into ${r.parts.join(', ')}`)
  return (await parallel(r.parts.map(p => () => build(p, depth + 1)))).flat().filter(Boolean)
}

// Barrier: the merge needs every branch.
phase('Build')
const built = (await parallel(blocks.map(b => () => build(b, 0)))).flat().filter(Boolean)
const icrs = built.flatMap(r => r.icrs)

phase('Merge')
const merged = await merge(built)
if (!merged.ok) return { green: false, stop: 'merge', merged, icrs }

phase('Judge')
const verdict = await judge()
if (!verdict.green) return { green: false, report: verdict.report, icrs }

phase('Simplify')
const slim = (await parallel(built.map(r => () =>
  worker('simplifier', r.block, 'Shrink your block. Tests and interfaces are locked.')))).filter(Boolean)
const slimMerged = await merge(slim)

phase('Judge')
const after = slimMerged.ok ? await judge() : { green: false, report: 'simplifier merge failed' }
// Simplifying made it red: put back the green build from before the simplifier ran.
if (!after.green) {
  await agent(`Run \`crew merge-wave -f ${feature} --undo\`.`, { label: 'undo', model: 'haiku', effort: 'low' })
}

return { green: true, simplified: after.green, built: built.map(r => r.block), icrs,
  report: after.green ? after.report : verdict.report }
