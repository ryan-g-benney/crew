export const meta = {
  name: 'recon',
  description: 'crew recon: map changed repo areas in parallel, update the atlas, write the feature slice',
  phases: [{ title: 'Explore' }, { title: 'Slice' }],
}

// args = { feature: 'rate-limit', intent: '...', areas: ['src', 'tests', '.'] }  (areas from `crew areas`)
const { feature, intent, areas } = args
const list = { type: 'array', items: { type: 'string' } }
const item = { type: 'object', properties: { name: { type: 'string' }, path: { type: 'string' },
  what: { type: 'string' }, when: { type: 'string' } } }
const AREA = { type: 'object', required: ['area', 'purpose', 'reusable'],
  properties: { area: { type: 'string' }, purpose: { type: 'string' }, entry_points: list,
    reusable: { type: 'array', items: item }, conventions: list, commands: { type: 'object' }, duplication: list } }

// Barrier: the slicer needs every area summary at once.
phase('Explore')
const found = (await parallel(areas.map(a => () =>
  agent(`Map the repo area "${a}"${a === '.' ? ' (only the top-level files)' : ''}.`,
    { label: a, agentType: 'crew:explorer', schema: AREA })))).filter(Boolean)

phase('Slice')
const summary = await agent(
  `Feature: ${feature}\nIntent: ${intent}\nChanged-area summaries (JSON):\n${JSON.stringify(found)}`,
  { label: 'slice', agentType: 'crew:slicer' })

return { explored: found.map(f => f.area), summary }
