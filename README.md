# crew

Run a feature in Claude Code like an engineering team. You approve the intent, the connections and the
interfaces; agents read the codebase, research, build in parallel and trim between your gates. State is
kept per branch, so any new session picks up where the last one stopped.

- **`crew`** is a small shell command (Python 3 stdlib, no LLM). It wraps `claude`, maps your branch to a
  feature, owns phases and file locks, builds agent briefs, runs the checks that need no LLM, and merges
  build waves.
- **The `crew` Claude Code plugin** holds the parts that need judgement: a skill per phase, nine agent
  roles, and four workflows that fan agents out.

## Install

Needs `git`, `python3` and `claude` (Claude Code 2.1.283 or newer for dynamic workflows). herdr is optional.

```bash
git clone https://github.com/ryan-g-benney/crew ~/Projects/crew
~/Projects/crew/install.sh
```

`install.sh` registers this clone as a plugin marketplace (`claude plugin marketplace add`), installs
`crew@crew`, and links `plugins/crew/bin/crew` to `~/.local/bin/crew`. Because the plugin is installed
from the local clone, `git pull` updates both the command and the plugin; run `/reload-plugins` in open
sessions.

Nothing is committed to your projects. The first `crew` run in a repo creates `.crew/` (feature state)
and adds it, plus `.claude/settings.local.json`, to `.git/info/exclude`.

## Use

```bash
cd ~/Projects/some-repo
git switch -c feat/API-142-rate-limit
crew                        # no feature for this branch yet: pick [n]ew, give a name and intent
```

Claude starts with a kickoff prompt and works until the next gate, then asks you. Answer in the chat.

| Phase | Skill | What happens | Your gate |
|---|---|---|---|
| start | `/crew:start` | recon workflow maps the repo (atlas + reusable inventory) and this feature's slice | approve the slice |
| scope | `/crew:scope` | acceptance cases with you, critic review, failing harness | approve + lock the harness |
| design | `/crew:design` | domain model, connections, blocks; researchers, critic; stubs + skeleton workflow | freeze the interfaces |
| build | `/crew:build` | wave workflow: builders in worktrees, merge, judge, simplifier | next wave / ICRs / verify |
| verify | `/crew:verify` | review workflow: correctness, security, mutation testing | approve the merge |

Coming back later, from any terminal:

```bash
crew                        # in the repo, on the feature's branch: resumes it (fresh session + brief)
crew --resume               # reopen the exact last conversation instead
crew --auto                 # same, in auto permission mode
crew ls                     # every feature under CREW_ROOTS, blocked ones first (herdr state if inside herdr)
crew go rate-limit          # open that feature (a new herdr tab when inside herdr)
crew status L2              # zoom: L0 intent · L1 connections · L2 blocks · L3 <block>
```

`CREW_ROOTS` defaults to `~/Projects:~/src:~/Documents`. `crew start NAME --worktree` gives a feature its
own worktree next to the repo, so several features can run at once in separate herdr tabs.

## How it stays honest

- **Locks.** Approving the harness and the freeze locks those files. The PreToolUse hook refuses edits,
  `crew check` catches changes made any other way, and `crew merge-wave` refuses branches that touch them.
  A builder that needs a locked change files an ICR (`crew icr`) for you to decide.
- **Budgets.** Each block has a line budget and at most two test functions. The judge reports actual vs
  budget; the simplifier then shrinks each green block toward 65% with tests locked, and is rolled back if
  anything turns red.
- **Worktrees.** Builders each work in their own git worktree (Claude Code's `isolation: "worktree"`),
  based on the feature branch because crew sets `worktree.baseRef: "head"`.

## Commands

```
crew [claude] [--resume] [--auto]   launch claude for this branch's feature
crew start NAME [--intent] [--ticket] [--branch] [--worktree]
crew status [L0|L1|L2|L3 BLOCK] [--json]      crew where [--atlas]
crew set KEY=VALUE... [--atlas]               crew areas
crew brief BLOCK      crew check      crew icr [TEXT --block B | --close ID --as accepted|rejected]
crew merge-wave BRANCH... | --undo            crew approve slice|harness|freeze|wave|merge [--lock GLOB]...
crew unlock GLOB...   crew ls   crew go NAME   crew hook session|guard
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

## Uninstall

```bash
claude plugin marketplace remove crew && rm ~/.local/bin/crew
```
