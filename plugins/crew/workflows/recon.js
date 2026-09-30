export const meta = {
  name: 'recon',
  description: 'crew recon: map changed repo areas in parallel (each to its own atlas file), then write the feature slice',
  phases: [{ title: 'Explore' }, { title: 'Slice' }],
}

// args = { feature: 'rate-limit', intent: '...', areas: ['src/api', 'tests', '.'] }  (areas from `crew areas`)
// Disk is the memory: each explorer writes atlas/areas/<area>.md and returns one line, so prompts carry
// paths, not content, and areas that did not change keep their files from earlier runs.
const { feature, intent, areas } = args
const AREA = { type: 'object', required: ['area', 'file', 'summary'],
  properties: { area: { type: 'string' }, file: { type: 'string' }, summary: { type: 'string' } } }

// Barrier: the slicer needs every area at once.
phase('Explore')
const found = (await parallel(areas.map(a => () =>
  agent(`Map the repo area "${a}"${a === '.' ? ' (only the top-level files)' : ''}.`,
    { label: a, agentType: 'crew:explorer', schema: AREA })))).filter(Boolean)

phase('Slice')
const summary = await agent(
  `Feature: ${feature}\nIntent: ${intent}\nAreas re-mapped in this run (details in each file):\n` +
  (found.map(f => `- ${f.area}: ${f.summary} (${f.file})`).join('\n') || '- none; the atlas is current'),
  { label: 'slice', agentType: 'crew:slicer' })

return { explored: found.map(f => f.area), summary }
