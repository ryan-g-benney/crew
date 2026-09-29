---
name: start
description: crew phase "start" - create or resume the crew feature for this branch, capture its intent, run recon, and stop at the slice gate. Use when the crew brief says phase start, or the user asks to start a crew feature.
---

# crew · start

Goal: know what we are building and which part of the codebase it touches. Then stop at the slice gate.
Never write feature code in this phase.

1. Run `crew status`. If there is no feature for this branch, ask the user for a short feature name and a
   one-paragraph intent, then run `crew start <name> --intent "<intent>"` (add `--ticket KEY` if they give one).
   If the intent in FEATURE.md is `TBD`, ask for it and write it there (`crew where` prints the folder).
2. Recon. Run `crew areas`: the repo areas that changed since the atlas was last built (all areas the first
   time, possibly none). Launch the `crew:recon` workflow (Workflow tool, `name: "crew:recon"`) with
   args `{"feature": "<name>", "intent": "<intent>", "areas": <that list>}` and wait for its result.
   An empty list is fine: the atlas is current and only this feature's slice gets written.
3. Slice gate. Read `context.md` in the feature folder and present it briefly: the files this feature
   touches, how data flows through them, what to reuse from INVENTORY.md (`crew where --atlas`), and the
   repo commands recon recorded. Ask: "Approve this slice?"
   - Approved: run `crew approve slice`, then continue with the crew:scope skill.
   - Wrong area: rerun step 2 with the user's notes appended to the intent.
