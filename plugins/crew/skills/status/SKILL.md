---
name: status
description: Show where the current crew feature stands at a chosen depth - L0 intent and next action, L1 connections, L2 blocks, L3 one block. Use when the user asks for crew status, "where are we", or a zoom level.
---

# crew · status

Read only; change nothing.

1. Run `crew status <level> [block]` (level defaults to L0) and show the output as it is.
2. At L2 during build or verify, also run `crew check` and add one line per block: lines vs budget,
   test functions, pass or fail.
3. End with one line: the next action and which crew skill continues it.
