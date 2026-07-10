#!/usr/bin/env bash
# router-skills — Linux/macOS installer (one command).
#
#   curl -fsSL https://raw.githubusercontent.com/nicolas2601/router-skills/main/install.sh | bash
#
# Clones the repo, ensures bun is available (offers to install it if missing),
# then runs the provisioner. git is the only hard prerequisite.
set -euo pipefail

REPO="https://github.com/nicolas2601/router-skills.git"
DEST="$HOME/.router-skills"

info() { printf '\033[36m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*" >&2; }
err()  { printf '\033[31m%s\033[0m\n' "$*" >&2; }

have() { command -v "$1" >/dev/null 2>&1; }

# git is non-negotiable (used to clone/update).
if ! have git; then
  err "git not found on PATH. Install it via your package manager, then re-run."
  exit 1
fi

# bun runs the provisioner. Install it automatically if missing.
if ! have bun; then
  warn "bun not found — installing it (https://bun.sh) ..."
  curl -fsSL https://bun.sh/install | bash
  # bun installs to ~/.bun/bin; make it visible for the rest of this script.
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"
  if ! have bun; then
    err "bun install finished but 'bun' is still not on PATH."
    err "Open a new terminal (so ~/.bun/bin is picked up) and re-run this command."
    exit 1
  fi
fi

if [ -d "$DEST/.git" ]; then
  info "Updating $DEST ..."
  git -C "$DEST" pull --ff-only
else
  info "Cloning into $DEST ..."
  git clone --depth 1 "$REPO" "$DEST"
fi

cd "$DEST"
info "Installing dependencies ..."
bun install --silent
exec bun run src/index.ts "$@"
