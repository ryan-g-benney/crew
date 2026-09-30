export const meta = {
  name: 'stubs',
  description: 'crew design: interface, fake and contract test per block in worktrees, merge, then the walking skeleton',
  phases: [{ title: 'Stubs' }, { title: 'Merge' }, { title: 'Skeleton' }],
}

// args = { feature: 'rate-limit', blocks: ['keystore', 'limiter'], case: 'AC-1' }
const { feature, blocks } = args
const list = { type: 'array', items: { type: 'string' } }
const REPORT = { type: 'object', required: ['block', 'branch', 'icrs'],
  properties: { block: { type: 'string' }, branch: { type: 'string' }, icrs: list } }
const MERGED = { type: 'object', required: ['ok', 'merged', 'conflicts', 'locked'],
  properties: { ok: { type: 'boolean' }, merged: list, conflicts: list, locked: list } }
const merge = (reports) => agent(
  `Run \`crew merge-wave -f ${feature} ${reports.map(r => r.branch).join(' ')}\` and return the JSON it prints.`,
  { label: 'merge', model: 'haiku', effort: 'low', schema: MERGED })

// Barrier: the merge needs every branch.
phase('Stubs')
const stubs = (await parallel(blocks.map(b => () =>
  agent(`Feature: ${feature}. Block: ${b}.`,
    { label: b, agentType: 'crew:stub-writer', isolation: 'worktree', schema: REPORT })))).filter(Boolean)

phase('Merge')
const merged = await merge(stubs)
if (!merged.ok) return { skeleton: false, merged }

phase('Skeleton')
const skel = await agent(
  `Skeleton mode. Feature: ${feature}. Block: skeleton. Make acceptance case ${args.case} pass end to end ` +
  'through the stubs and fakes, adding nothing else. Splitting is not allowed.',
  { label: 'skeleton', agentType: 'crew:builder', isolation: 'worktree', schema: REPORT })
const skelMerged = skel ? await merge([skel]) : { ok: false, conflicts: ['skeleton agent failed'] }

return { stubs: stubs.map(s => s.block), skeleton: skelMerged.ok, merged: skelMerged,
  icrs: [...stubs, skel].filter(Boolean).flatMap(r => r.icrs) }
