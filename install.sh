#!/usr/bin/env bash
# router-skills — Linux/macOS installer
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/nicolas2601/router-skills/main/install.sh | bash
#
# Clones the repo, installs deps with bun, and runs the provisioner.
# Requires: git + bun on PATH.
set -euo pipefail

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing '$1' on PATH." >&2
    [ "$1" = "bun" ] && echo "Install: curl -fsSL https://bun.sh/install | bash" >&2
    [ "$1" = "git" ] && echo "Install git via your package manager." >&2
    exit 1
  fi
}
need git
need bun

dest="$HOME/.router-skills"
if [ -d "$dest/.git" ]; then
  echo "Updating $dest ..."
  git -C "$dest" pull --ff-only
else
  echo "Cloning into $dest ..."
  git clone --depth 1 https://github.com/nicolas2601/router-skills.git "$dest"
fi

cd "$dest"
bun install
exec bun run src/index.ts "$@"
