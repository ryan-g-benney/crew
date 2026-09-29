export const meta = {
  name: 'wave',
  description: 'crew build: one wave - builders in worktrees, merge, judge, simplifier, re-judge',
  phases: [{ title: 'Build' }, { title: 'Merge' }, { title: 'Judge' }, { title: 'Simplify' }],
}

// args = { feature: 'rate-limit', wave: 1, blocks: ['keystore', 'limiter', 'middleware'] }
const { feature, wave, blocks } = args
const list = { type: 'array', items: { type: 'string' } }
const REPORT = { type: 'object', required: ['block', 'branch', 'icrs'],
  properties: { block: { type: 'string' }, branch: { type: 'string' }, icrs: list } }
const MERGED = { type: 'object', required: ['ok', 'merged', 'conflicts', 'locked'],
  properties: { ok: { type: 'boolean' }, merged: list, conflicts: list, locked: list } }
const VERDICT = { type: 'object', required: ['green', 'report'],
  properties: { green: { type: 'boolean' }, report: { type: 'string' } } }

// One agent per block, each in its own worktree. Barrier: the merge needs every branch.
const fanOut = (role, task) => parallel(blocks.map(b => () =>
  agent(`${task}\nFeature: ${feature}. Block: ${b}. Wave: ${wave}.`,
    { label: `${role}: ${b}`, agentType: `crew:${role}`, isolation: 'worktree', schema: REPORT })))
const merge = (reports) => agent(
  `Run \`crew merge-wave -f ${feature} ${reports.map(r => r.branch).join(' ')}\` and return the JSON it prints.`,
  { label: 'merge', model: 'haiku', schema: MERGED })
const judge = () => agent(`Judge wave ${wave} of feature ${feature}.`,
  { label: 'judge', agentType: 'crew:judge', schema: VERDICT })

phase('Build')
const built = (await fanOut('builder', 'Build your block.')).filter(Boolean)
const icrs = built.flatMap(r => r.icrs)

phase('Merge')
const merged = await merge(built)
if (!merged.ok) return { green: false, stop: 'merge', merged, icrs }

phase('Judge')
const verdict = await judge()
if (!verdict.green) return { green: false, report: verdict.report, icrs }

phase('Simplify')
const slim = (await fanOut('simplifier', 'Shrink your block. Tests and interfaces are locked.')).filter(Boolean)
const slimMerged = await merge(slim)

phase('Judge')
const after = slimMerged.ok ? await judge() : { green: false, report: 'simplifier merge failed' }
// Simplifying made it red: put back the green build from before the simplifier ran.
if (!after.green) await agent(`Run \`crew merge-wave -f ${feature} --undo\`.`, { label: 'undo', model: 'haiku' })

return { green: true, simplified: after.green, report: after.green ? after.report : verdict.report, icrs }
