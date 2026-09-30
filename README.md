# crew

Run a feature in Claude Code like an engineering team. You approve the intent, the connections and the
interfaces; agents read the codebase, research, build in parallel and trim between your gates. State is
kept per repo and branch, so you can leave any feature and pick it up later, in a fresh session, from any
terminal.

## Set up

**The easy way:** open Claude Code anywhere and paste:

```
Set up crew for me from https://github.com/ryan-g-benney/crew. Clone it and follow the
"Instructions for Claude: setup" section of its README.
```

**By hand:** needs `git`, `python3` (3.8+) and Claude Code with dynamic workflows (`/workflows` exists;
built on 2.1.283). herdr is optional.

```bash
git clone https://github.com/ryan-g-benney/crew ~/Projects/crew
~/Projects/crew/install.sh
```

Then restart Claude Code (plugins and hooks load when a session starts).

### Instructions for Claude: setup

Follow these steps in order and report the result of each. Ask the user before changing any file outside
the crew clone (shell rc files, `~/.claude/settings.json`).

1. Check prerequisites: `git --version`, `python3 --version` (need 3.8 or newer), `claude --version`.
   Stop and tell the user if any is missing.
2. Get the code. If `~/Projects/crew` exists, run `git -C ~/Projects/crew pull`; otherwise
   `git clone https://github.com/ryan-g-benney/crew ~/Projects/crew`. Use another path if the user asks.
3. Run `~/Projects/crew/install.sh`. It is safe to re-run; "already installed" messages are fine. It
   registers the clone as a plugin marketplace, installs the `crew@crew` plugin, and links the `crew`
   command into `~/.local/bin`.
4. Verify:
   - `claude plugin list` shows `crew@crew` as enabled
   - `command -v crew` prints a path. If it doesn't, `~/.local/bin` is not on PATH: offer to add
     `export PATH="$HOME/.local/bin:$PATH"` to the user's shell rc file
   - `python3 ~/Projects/crew/tests/test_crew.py` prints `ok`
5. Offer, and only apply if the user agrees: add `"Bash(crew:*)"` to `permissions.allow` in
   `~/.claude/settings.json`, so agents can call `crew` without a permission prompt each time.
6. If the user keeps repos somewhere other than `~/Projects`, `~/src` or `~/Documents`, tell them to set
   `CREW_ROOTS` (colon-separated) in their shell rc so `crew ls` and `crew go` can find them.
7. Tell the user to restart Claude Code, then start a feature with `cd <repo> && git switch -c <branch> && crew`.

## What you are installing (it's more than a skill)

One install gives you four pieces that work together:

| Piece | How you use it | What it does |
|---|---|---|
| `crew` command | you type it in a terminal, instead of `claude` | finds the feature for your repo and branch, launches Claude with a kickoff prompt, lists and opens features across projects. Agents also call it to read and change state. |
| Skills (`/crew:start` … `/crew:verify`) | Claude picks the right one from the kickoff prompt; you rarely type them | the playbook for each phase, ending at a gate where Claude stops and asks you |
| Agents and workflows | Claude launches them; watch them in `/workflows` | the "team": explorers, critics, researchers, builders in their own worktrees, a judge, a simplifier, reviewers |
| Hooks | automatic | brief every new session with the feature's phase and next step; refuse edits to locked files |

So the skill is only the playbook. The `crew` command and the hooks carry state between sessions, which
is what makes resuming and switching projects work.

## Using it

### Start a feature

```bash
cd ~/Projects/some-repo
git switch -c feat/API-142-rate-limit     # a ticket key in the branch name is picked up automatically
crew                                      # new work: asks for a title and a one-line intent
```

Started on `main` (or with no branch), new work gets its own worktree and `feat/<name>` branch next to the
repo, so your main checkout is never touched. Claude starts and works through the phases. At each gate it stops and asks you; answer in the chat.

| Phase | What happens | Your gate |
|---|---|---|
| start | recon maps the repo (atlas + inventory of reusable code) and this feature's slice of it | approve the slice |
| scope | acceptance cases with you, a critic's review, a failing test harness | approve and lock the harness |
| design | domain model, connections, blocks; researchers and a critic; interface stubs and a walking skeleton | freeze the interfaces |
| build | one wave at a time: builders in worktrees, merge, judge, simplifier | next wave, handle interface change requests, or move to verify |
| verify | correctness and security reviews, mutation testing, PR description | approve the merge |

### Pick up where you left off

| Situation | Do this |
|---|---|
| Choose what to work on in this repo | `crew -c` (or `crew --continue`): lists every feature with its title, and its recent sessions with Claude's own title for each |
| Same repo, same branch | `crew`: a fresh session that starts from a short brief (cheaper than reloading the old chat) |
| You want the exact previous conversation | `crew --resume`, or pick it in `crew -c` |
| A different project | `crew go` with no name: the same picker across every repo. `crew go <name>` jumps straight there |
| See everything at once | `crew ls`: every feature in every repo, blocked ones first |
| You opened plain `claude` in the repo | the session-start hook still prints the brief; say "continue" |
| After `/clear` or a compaction | the hook briefs the session again |
| You switched branches mid-session | run `/crew:status` (or `crew status`): it looks up the branch again |
| You want fewer permission prompts | `crew --auto` starts Claude in auto permission mode |

`crew go` switches branches in the repo's main checkout, so it stops if that checkout has uncommitted
changes. To avoid that, and to run several features at once, give a feature its own worktree when you
create it: `crew start "<title>" --worktree`. Inside herdr, `crew go` opens each feature in a new tab, and
`crew ls` shows which sessions are working, blocked (waiting for you) or done.

The picker looks like this. Type `1` for a fresh session on that feature or `1a` to resume that session:

```
  1  Per-key rate limiting  [per-key-rate-limiting · build · llm_endpoint:feat/API-142-rate-limit]
     1a  09-30 11:07  build   Wave 2 triage and the tenant_id ICR
     1b  09-29 16:40  design  Designing limiter blocks
  2  SSE streaming  [sse-streaming · scope · llm_endpoint:feat/sse-streaming]
    n  new work (asks for a title)
    p  plain claude
```

### Check progress at any depth

```bash
crew status          # L0: intent, phase, next step, open interface change requests
crew status L1       # connections: data sources and services, how they fail, what fakes them
crew status L2       # blocks: who owns what, interfaces, budgets, waves
crew status L3 <block>
```

The same levels are available inside a session with `/crew:status L2`.

## Long features and big repos

crew is built to run for days on large codebases without its context growing:

- **Every phase starts small.** A new session loads only the brief: title, phase, next step, the last three
  log lines and open change requests. At each gate Claude records one line with `crew note` and offers
  `/clear`; the brief reloads from `.crew/`, so nothing is lost. The log keeps its newest 12 lines, and older
  ones move to `history.md`.
- **Agents get paths, not transcripts.** Each agent starts from its role file and `crew brief <block>`: its
  intent, owned files, budget, locks and conventions. Workflow agents return short JSON; the full detail
  stays in the workflow run, not in your session.
- **Disk is the memory for the repo map.** Each recon explorer writes `atlas/areas/<area>.md` and returns one
  line. Recon only re-maps areas that changed since the last run, and top-level folders with more than 300
  files are split into their subfolders so no explorer gets too much.
- **Big blocks split themselves.** A builder whose block is over ~150 lines, or does more than one thing,
  splits it into parts (`crew split`) instead of building it. The build workflow sends each part through
  the same build step in parallel, up to two levels deep, then merges, judges and simplifies the leaves.
- **Cheap models where judgement isn't needed.** Explorers run on Haiku, merges on Haiku at low effort.

## Where things live

- **In your project, committed as normal code:** the acceptance harness, interface stubs, fakes, tests and
  the feature code, on the feature branch.
- **In your project, never committed:** `.crew/` (feature state, design notes, the repo atlas),
  `.claude/settings.local.json`, and `.claude/worktrees/` (where builder agents work). crew adds all three to
  `.git/info/exclude`, git's per-clone ignore file, so they never reach a commit and your `.gitignore` is
  untouched. crew never runs `git push`; you push the feature branch yourself.
- These notes are local to the machine. On another machine the committed code comes with the branch, but
  the `.crew/` notes do not.

## How it stays honest

- **Locks.** Approving the harness and the freeze locks those files. The PreToolUse hook refuses edits,
  `crew check` catches changes made any other way, and `crew merge-wave` refuses branches that touch them.
  A builder that needs a locked change files an interface change request (`crew icr`) for you to decide.
- **Budgets.** Each block has a line budget and at most two test functions. The judge reports actual vs
  budget; the simplifier then shrinks each green block toward 65% with tests locked, and is rolled back if
  anything turns red.
- **Worktrees.** Builders each work in their own git worktree, based on the feature branch because crew
  sets `worktree.baseRef: "head"`.

## Commands

```
crew [claude] [-c] [--resume] [--auto]   launch claude for this branch's feature; -c shows the picker
crew ls                             every feature under CREW_ROOTS (default ~/Projects:~/src:~/Documents)
crew go [NAME] [--resume] [--auto]  open a feature from anywhere; no NAME shows the picker
crew start TITLE [--name] [--intent] [--ticket] [--branch] [--worktree]
crew note TEXT                      add a dated line to the feature's log
crew split BLOCK PART=GLOB[,GLOB]:BUDGET[:NOTE]...   replace a block with smaller parts
crew status [L0|L1|L2|L3 BLOCK] [--json]      crew where [--atlas]
crew set KEY=VALUE... [--atlas]               crew areas
crew brief BLOCK      crew check      crew icr [TEXT --block B | --close ID --as accepted|rejected]
crew merge-wave BRANCH... | --undo            crew approve slice|harness|freeze|wave|merge [--lock GLOB]...
crew unlock GLOB...   crew hook session|guard
```

Every command takes `-f FEATURE` (after the command) to skip branch discovery.

## Layout

```
.claude-plugin/marketplace.json      this repo is a one-plugin marketplace
plugins/crew/
  bin/crew                           the command
  hooks/hooks.json                   SessionStart brief · PreToolUse lock guard
  skills/{start,scope,design,build,verify,status}/SKILL.md
  agents/                            explorer slicer critic researcher stub-writer builder judge simplifier reviewer
  workflows/{recon,stubs,wave,review}.js
tests/test_crew.py                   python3 tests/test_crew.py
```

## Update and uninstall

```bash
git -C ~/Projects/crew pull                                    # updates the command and the plugin
claude plugin marketplace remove crew && rm ~/.local/bin/crew  # uninstall
```

In open sessions, run `/reload-plugins` after an update.
