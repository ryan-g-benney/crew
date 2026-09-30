---
name: build
description: crew phase "build" - run the current build wave (parallel builders in worktrees, merge, judge, simplifier) and stop at the build gate with the judge's report and open ICRs. Use when the crew brief says phase build.
---

# crew · build

Goal: run one wave, then stop at the build gate. You orchestrate; builders write the code.

1. `crew status --json` gives the wave number. Take that wave's blocks from `## Waves` in design.md.
2. Launch the `crew:wave` workflow (Workflow tool, `name: "crew:wave"`) with args
   `{"feature": "<name>", "wave": <n>, "blocks": [<blocks>]}` and wait for its result.
3. Build gate. Present, briefly: green or red and the judge's report, lines vs budget and test counts per
   block (from the report), whether the simplifier's pass landed, and open ICRs (`crew icr`).
   Blocks that were split show up under their part names. Record the wave in one line:
   `crew note "wave <n>: green|red; <lines vs budget>; <ICR ids>"`. Ask the user what to do, then:
   - Next wave: `crew approve wave`, then go back to step 1.
   - ICR accepted: `crew icr --close <id> --as accepted`, `crew unlock "<interface file>"`,
     `crew set phase=design next="amend <file> for <id>"`, then continue with the crew:design skill.
   - ICR rejected: `crew icr --close <id> --as rejected`. The builder adapts in the next run.
   - Red: show the failing checks. After the user decides, rerun the wave for the failing blocks only.
   - All waves green: `crew set phase=verify next="crew:verify skill"`, then continue with crew:verify.

More than 2 ICRs in one wave means the design is wrong: recommend going back to design rather than
patching interfaces one by one.

Long features: each wave's details stay in the workflow run; only the one-line note and state carry
forward. After recording the gate, tell the user they can run `/clear` before the next wave: the brief
reloads from .crew, so every wave starts with a small context.
