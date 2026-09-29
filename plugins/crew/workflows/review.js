export const meta = {
  name: 'review',
  description: 'crew verify: correctness review, security review and a mutation-testing run, in parallel',
  phases: [{ title: 'Review' }],
}

// args = { feature: 'rate-limit' }
const { feature } = args
const FINDINGS = { type: 'object', required: ['findings'],
  properties: { findings: { type: 'array', items: { type: 'string' } } } }
const review = angle => () => agent(`Angle: ${angle}. Feature: ${feature}.`,
  { label: angle, agentType: 'crew:reviewer', schema: FINDINGS })

phase('Review')
const [correctness, security, mutation] = await parallel([
  review('correctness'),
  review('security'),
  () => agent(
    `Mutation testing for crew feature ${feature}. If this is a Python repo, run mutmut (\`uvx mutmut run\`) ` +
    `on the non-test files owned by blocks in \`crew status --json -f ${feature}\` (field "owners"), then list ` +
    'each surviving mutant as "file:line: what changed". If mutmut cannot run here, return one finding ' +
    'saying why it was skipped.',
    { label: 'mutation', model: 'sonnet', schema: FINDINGS }),
])

return { correctness, security, mutation }
