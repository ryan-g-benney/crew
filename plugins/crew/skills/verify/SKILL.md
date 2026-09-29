---
name: verify
description: crew phase "verify" - run correctness and security reviews plus mutation testing, fix what the user picks, draft the PR description, and stop at the merge gate. Use when the crew brief says phase verify.
---

# crew · verify

1. Launch the `crew:review` workflow (Workflow tool, `name: "crew:review"`) with args
   `{"feature": "<name>"}` and wait for its result.
2. Present the findings, most severe first, then surviving mutants, then a fresh `crew check`.
3. Fix only what the user picks: small fixes in this session inside the owning block's files; anything
   bigger as a build wave for that block. Locks still apply.
4. Draft the PR description from FEATURE.md (intent, acceptance cases, decisions) and design.md
   (connections and blocks in a few lines). Put it in your reply for the user to paste.
5. Merge gate. Ask: "Approve for merge?" Approved: `crew approve merge`. The user opens or merges the PR.
