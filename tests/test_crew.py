"""Run: python3 tests/test_crew.py   (also works under pytest)."""
import json
import os
import subprocess
import tempfile
from pathlib import Path

CREW = Path(__file__).resolve().parents[1] / "plugins" / "crew" / "bin" / "crew"
TMP = tempfile.TemporaryDirectory()                                    # removed when the run ends
ENV = {**os.environ, "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t", "GIT_COMMITTER_NAME": "t",
       "GIT_COMMITTER_EMAIL": "t@t"}


def sh(repo, *args, stdin=None, ok=True):
    r = subprocess.run(args, cwd=repo, env=ENV, input=stdin, capture_output=True, text=True)
    assert r.returncode == 0 or not ok, r.stderr
    return r.stdout


def crew(repo, *args, **kw):
    return sh(repo, str(CREW), *args, **kw)


def commit(repo, path, text):
    (repo / path).parent.mkdir(parents=True, exist_ok=True)
    (repo / path).write_text(text)
    sh(repo, "git", "add", "-A")
    sh(repo, "git", "commit", "-qm", f"edit {path}")


def new_repo():
    repo = Path(tempfile.mkdtemp(dir=TMP.name))
    sh(repo, "git", "init", "-qb", "main")
    commit(repo, "README.md", "x\n")
    sh(repo, "git", "switch", "-qc", "feat/API-7-limits")
    crew(repo, "start", "limits", "--intent", "rate limit keys")
    return repo


def test_discovery_state_and_gates():
    repo = new_repo()
    st = json.loads(crew(repo, "status", "--json"))
    assert (st["ticket"], st["phase"], st["branches"]) == ("API-7", "start", ["feat/API-7-limits"])
    assert {".crew/", ".claude/worktrees/"} <= set((repo / ".git/info/exclude").read_text().split())
    assert json.loads((repo / ".claude/settings.local.json").read_text())["worktree"]["baseRef"] == "head"
    sh(repo, "git", "switch", "-qc", "feat/API-7-limits-v2")          # renamed branch: found via ticket, then linked
    assert json.loads(crew(repo, "status", "--json"))["branches"][-1] == "feat/API-7-limits-v2"
    assert "phase start" in crew(repo, "hook", "session", stdin=json.dumps({"cwd": str(repo)}))
    assert "phase scope" in crew(repo, "approve", "slice")
    assert "limits-1" == crew(repo, "icr", "need tenant id", "--block", "limits").strip()


def test_locks_guard_check_merge():
    repo = new_repo()
    commit(repo, "tests/cases/a.json", "{}\n")
    crew(repo, "approve", "harness", "--lock", "tests/cases/**")
    guard = lambda f: crew(repo, "hook", "guard", stdin=json.dumps({"cwd": str(repo), "tool_input": {"file_path": f}}))
    assert "deny" in guard(str(repo / "tests/cases/a.json")) and guard(str(repo / "src/x.py")) == ""
    (repo / "tests/cases/a.json").write_text("{1}\n")                   # an edit made through Bash, not Edit
    assert json.loads(crew(repo, "check"))["locks"] == ["tests/cases/a.json"]
    sh(repo, "git", "checkout", "--", "tests/cases/a.json")
    for b, path in (("bad", "tests/cases/a.json"), ("good", "src/y.py")):
        sh(repo, "git", "switch", "-qc", b)
        commit(repo, path, "changed\n")
        sh(repo, "git", "switch", "-q", "feat/API-7-limits")
    assert json.loads(crew(repo, "merge-wave", "bad", ok=False))["locked"] == ["tests/cases/a.json"]
    assert json.loads(crew(repo, "merge-wave", "good"))["merged"] == ["good"]
    assert (repo / "src/y.py").exists()
    crew(repo, "merge-wave", "--undo")
    assert not (repo / "src/y.py").exists()


if __name__ == "__main__":
    test_discovery_state_and_gates()
    test_locks_guard_check_merge()
    print("ok")
