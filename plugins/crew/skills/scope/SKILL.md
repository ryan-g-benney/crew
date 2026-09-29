---
name: scope
description: crew phase "scope" - agree what "done" means as acceptance cases, build a runnable failing harness, and stop at the harness gate. Use when the crew brief says phase scope.
---

# crew · scope

Goal: the fewest acceptance cases that pin the behaviour down, written as data, with one runner that fails
for the right reason. Then stop at the harness gate.

1. Read FEATURE.md and context.md (`crew where`). Draft the cases with the user, each as
   `AC-n  WHEN <condition> THE SYSTEM SHALL <observable result>`.
   Only behaviour at the boundary (HTTP, CLI, public API, UI), never internals.
2. Ask the `crew:critic` agent (Agent tool, `subagent_type: "crew:critic"`) to review the draft in
   requirements mode, passing the intent and the cases. Bring its missing cases and ambiguities to the
   user and add only what they agree to. Never add scope on your own.
3. Build the harness in the repo's own test framework and layout (ATLAS.md says which):
   - one data file per case, e.g. `tests/acceptance/cases/ac-1.json` with `given`, `input`, `expect`
   - ONE runner test function that loads every case file
   - non-deterministic output: assert a property (range, shape, invariant), not an exact value;
     external services: recorded or faked responses; UI: one scripted user flow per case
   Run it. Every case must fail because the feature is missing, not because of a harness bug.
4. List the cases under `## Acceptance` in FEATURE.md. Commit the harness:
   `git add <harness files> && git commit -m "<feature>: acceptance harness"` (no AI attribution).
5. Harness gate. Show the cases and the critic's open points. Ask: "Approve and lock the harness?"
   - Approved: `crew approve harness --lock "<cases glob>" --lock "<runner file>"`, then continue with the
     crew:design skill.

Expected outputs belong to the user. Once locked they change only through a harness amendment the user
asks for: `crew unlock <glob>`, edit, commit, `crew approve harness --lock <glob>` again.
