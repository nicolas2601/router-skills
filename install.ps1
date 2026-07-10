# router-skills — Windows installer (one command, PowerShell).
#
#   irm https://raw.githubusercontent.com/nicolas2601/router-skills/main/install.ps1 | iex
#
# Clones the repo, ensures bun is available (installs it if missing), then runs the
# provisioner. git is the only hard prerequisite. No admin needed — skill/agent links
# use directory junctions, not symlinks.

$ErrorActionPreference = "Stop"
$Repo = "https://github.com/nicolas2601/router-skills.git"
$Dest = Join-Path $HOME ".router-skills"

function Have($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

# git is non-negotiable.
if (-not (Have git)) {
  Write-Host "git not found on PATH. Install it (winget install Git.Git) and re-run." -ForegroundColor Red
  exit 1
}

# bun runs the provisioner — install automatically if missing.
if (-not (Have bun)) {
  Write-Host "bun not found — installing it (https://bun.sh) ..." -ForegroundColor Yellow
  powershell -NoProfile -Command "irm bun.sh/install.ps1 | iex"
  # bun installs to %USERPROFILE%\.bun\bin; make it visible for the rest of this session.
  $bunBin = Join-Path $HOME ".bun\bin"
  if (Test-Path $bunBin) { $env:Path = "$bunBin;$env:Path" }
  if (-not (Have bun)) {
    Write-Host "bun installed but 'bun' is still not on PATH." -ForegroundColor Red
    Write-Host "Open a NEW PowerShell window and re-run this command." -ForegroundColor Red
    exit 1
  }
}

if (Test-Path (Join-Path $Dest ".git")) {
  Write-Host "Updating $Dest ..." -ForegroundColor Cyan
  git -C $Dest pull --ff-only
} else {
  Write-Host "Cloning into $Dest ..." -ForegroundColor Cyan
  git clone --depth 1 $Repo $Dest
}

Push-Location $Dest
try {
  Write-Host "Installing dependencies ..." -ForegroundColor Cyan
  bun install --silent
  bun run src/index.ts @args
} finally {
  Pop-Location
}
