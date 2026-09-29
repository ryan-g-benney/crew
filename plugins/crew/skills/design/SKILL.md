---
name: design
description: crew phase "design" - design the domain model, connections and blocks with the user, write interface stubs and a walking skeleton, and stop at the freeze gate. Also used to amend a frozen interface after an accepted ICR. Use when the crew brief says phase design.
---

# crew · design

Goal: blocks with small, deep interfaces that other blocks can build against in parallel, proven by one
acceptance case running end to end. Then stop at the freeze gate.

1. Read FEATURE.md, context.md and INVENTORY.md (`crew where`, `crew where --atlas`).
2. Write `design.md` in the feature folder with the user, in this order and with these headings
   (crew reads them by name):

   ```
   ## Domain model   entities, invariants, states; types that make illegal states impossible
   ## Connections    | Connection | Direction | How | Auth | Fails how → handling | Fake in tests |
   ## Blocks         | Block | Responsibility (one sentence) | Owns (globs) | Interface file | Depends on | Reuse | Budget |
   ## Conventions    errors, logging, config, naming, async; a new dependency needs an ICR
   ## Waves          wave 1: blocks that build in parallel against fakes; last wave: wiring
   ## Rollout        flags, migrations, rollback
   ## Risks          open questions and spikes, with answers once known
   ```
   Rules: every data source and service sits behind a port with a fake. Interfaces exist only at block
   edges and I/O ports, and each has two implementations (real + fake). Pure logic goes in a functional
   core, I/O in thin adapters. Reuse is one of: reuse <INVENTORY item> · extend <item> · local ·
   shared (shared needs a third use).
3. Open questions: one `crew:researcher` agent per question, in parallel. A risky unknown: a
   `crew:researcher` in spike mode with `isolation: "worktree"`; keep only its answer.
4. Ask a `crew:critic` agent in design mode to attack design.md against INVENTORY.md. Apply the cuts the
   user accepts.
5. Record ownership and budgets (owner globs must not overlap):
   `crew set owners='{"<block>": ["<glob>"]}' budgets='{"<block>": <lines>}'`
   For each block write `blocks/<block>.md`: purpose, interface file, objects, call sequence, notes.
6. Launch the `crew:stubs` workflow (Workflow tool, `name: "crew:stubs"`) with args
   `{"feature": "<name>", "blocks": [<wave-1 blocks>], "case": "<one AC id for the skeleton>"}`.
   It writes each block's interface, fake and contract test in parallel, merges them, then builds the
   skeleton so that one case passes through the stubs.
7. Freeze gate. Present L1 (connections table), L2 (blocks table plus a mermaid diagram of who calls
   whom), L3 (each interface file with its signatures), whether the skeleton case passes, and the budgets.
   Ask: "Freeze these interfaces?"
   - Approved: commit anything left, then `crew approve freeze --lock "<file>"` once per interface, fake
     and contract-test file. Continue with the crew:build skill.
   - Changes: edit design.md and rerun step 6 for the affected blocks.

Amending after an accepted ICR (phase was set back to design): change only what the ICR needs in
design.md and the stub, rerun the block's contract test, commit, then `crew approve freeze --lock <file>`
again. The wave number is kept.
