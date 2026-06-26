# router-skills — Windows installer
# Usage (PowerShell):
#   irm https://raw.githubusercontent.com/nicolas2601/router-skills/main/install.ps1 | iex
#
# Clones the repo, installs deps with bun, and runs the provisioner.
# Requires: git + bun on PATH. Junctions are used for skill links (no admin needed).

$ErrorActionPreference = "Stop"

function Need($cmd) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host "Missing '$cmd' on PATH." -ForegroundColor Red
    if ($cmd -eq "bun") { Write-Host "Install: powershell -c `"irm bun.sh/install.ps1|iex`"" }
    if ($cmd -eq "git") { Write-Host "Install: winget install Git.Git" }
    exit 1
  }
}
Need git
Need bun

$dest = Join-Path $HOME ".router-skills"
if (Test-Path $dest) {
  Write-Host "Updating $dest ..." -ForegroundColor Cyan
  git -C $dest pull --ff-only
} else {
  Write-Host "Cloning into $dest ..." -ForegroundColor Cyan
  git clone --depth 1 https://github.com/nicolas2601/router-skills.git $dest
}

Push-Location $dest
bun install
bun run src/index.ts @args
Pop-Location
