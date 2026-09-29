#!/usr/bin/env bash
# Register this clone as a Claude Code plugin marketplace, install the crew plugin,
# and put the `crew` command on your PATH. Safe to re-run (errors about "already" are fine).
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for c in git python3 claude; do
  command -v "$c" >/dev/null || { echo "crew: '$c' not found on PATH" >&2; exit 1; }
done
claude plugin marketplace add "$here" || true
claude plugin install crew@crew || true
mkdir -p "$HOME/.local/bin"
ln -sf "$here/plugins/crew/bin/crew" "$HOME/.local/bin/crew"
case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) echo "crew: add ~/.local/bin to your PATH" ;; esac
echo "crew installed. In any git repo on a feature branch, run: crew"
