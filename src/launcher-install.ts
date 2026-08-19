import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs"
import { execFileSync } from "node:child_process"
import nodePath from "node:path"
import { fileURLToPath } from "node:url"
import { whichSync } from "./util.ts"

export type LauncherPlatform = "windows" | "posix"
type PathImpl = Pick<typeof nodePath, "join">

const platformPath = (platform: LauncherPlatform) => platform === "windows" ? nodePath.win32 : nodePath.posix

export const binDir = (home: string, platform: LauncherPlatform, p: PathImpl = platformPath(platform)) =>
  p.join(home, ".local", "bin")

export const launcherPath = (home: string, platform: LauncherPlatform, p: PathImpl = platformPath(platform)) =>
  p.join(binDir(home, platform, p), platform === "windows" ? "router-skills.cmd" : "router-skills")

const canonicalPath = (value: string, platform: LauncherPlatform) => {
  const trimmed = value.trim().replace(/[\\/]+$/, "")
  return platform === "windows" ? trimmed.replaceAll("/", "\\").toLowerCase() : trimmed
}

const batchValue = (value: string) => value.replaceAll("%", "%%")

export function pathEntry(existing: string, entry: string, platform: LauncherPlatform): { value: string; added: boolean } {
  const delimiter = platform === "windows" ? ";" : ":"
  const entries = existing.split(delimiter).filter(Boolean)
  const wanted = canonicalPath(entry, platform)
  if (entries.some((candidate) => canonicalPath(candidate, platform) === wanted)) {
    return { value: existing, added: false }
  }
  return { value: existing ? `${existing}${delimiter}${entry}` : entry, added: true }
}

export const updatedSessionPath = (existing: string, entry: string, platform: LauncherPlatform) =>
  pathEntry(existing, entry, platform).value

const windowsLauncher = (repoPath: string, bunPath: string) => [
  "@echo off",
  "setlocal",
  `set "ROUTER_SKILLS_ROOT=${batchValue(repoPath)}"`,
  `set "ROUTER_SKILLS_BUN=${batchValue(bunPath)}"`,
  "if defined ROUTER_SKILLS_BUN for %%R in (\"%ROUTER_SKILLS_BUN%\") do if /i \"%%~aR\"==\"d----------\" set \"ROUTER_SKILLS_BUN=\"",
  "if defined ROUTER_SKILLS_BUN for %%R in (\"%ROUTER_SKILLS_BUN%\") do if /i not \"%%~xR\"==\".exe\" if /i not \"%%~xR\"==\".cmd\" if /i not \"%%~xR\"==\".bat\" if /i not \"%%~xR\"==\".com\" set \"ROUTER_SKILLS_BUN=\"",
  "if defined ROUTER_SKILLS_BUN if not exist \"%ROUTER_SKILLS_BUN%\" set \"ROUTER_SKILLS_BUN=\"",
  "if not defined ROUTER_SKILLS_BUN for /f \"delims=\" %%B in ('where bun 2^>nul') do set \"ROUTER_SKILLS_BUN=%%B\"",
  "if not defined ROUTER_SKILLS_BUN (",
  "  echo router-skills: Bun was not found. Install Bun from https://bun.sh and re-run the installer.",
  "  exit /b 1",
  ")",
  `"%ROUTER_SKILLS_BUN%" run "%ROUTER_SKILLS_ROOT%\\src\\index.ts" %*`,
  "exit /b %ERRORLEVEL%",
  "",
].join("\r\n")

const shellQuote = (value: string) => "'" + value.split("'").join("'\u0022'\u0022'") + "'"

const posixLauncher = (repoPath: string, bunPath: string) => [
  "#!/usr/bin/env sh",
  `ROUTER_SKILLS_ROOT=${shellQuote(repoPath)}`,
  `ROUTER_SKILLS_BUN=${shellQuote(bunPath)}`,
  "if [ ! -f \"$ROUTER_SKILLS_BUN\" ] || [ ! -x \"$ROUTER_SKILLS_BUN\" ]; then",
  "  ROUTER_SKILLS_BUN=$(command -v bun || true)",
  "fi",
  "if [ -z \"$ROUTER_SKILLS_BUN\" ]; then",
  "  printf '%s\\n' 'router-skills: Bun was not found. Install Bun from https://bun.sh and re-run the installer.' >&2",
  "  exit 1",
  "fi",
  "exec \"$ROUTER_SKILLS_BUN\" run \"$ROUTER_SKILLS_ROOT/src/index.ts\" \"$@\"",
  "",
].join("\n")

export function launcherContent(platform: LauncherPlatform, repoPath: string, bunPath: string): string {
  return platform === "windows" ? windowsLauncher(repoPath, bunPath) : posixLauncher(repoPath, bunPath)
}

export const posixPathBlock = (entry: string) => [
  "# router-skills: PATH begin",
  `ROUTER_SKILLS_BIN=${shellQuote(entry)}`,
  'case ":${PATH:-}:" in',
  '  *":$ROUTER_SKILLS_BIN:"*) ;;',
  '  *) export PATH="$ROUTER_SKILLS_BIN${PATH:+:$PATH}" ;;',
  "esac",
  "unset ROUTER_SKILLS_BIN",
  "# router-skills: PATH end",
  "",
].join("\n")

export function appendPosixPathConfig(existing: string, block: string): string {
  return existing.includes("# router-skills: PATH begin") ? existing : `${existing}${existing && !existing.endsWith("\n") ? "\n" : ""}${block}`
}

function powerShell(command: string): string {
  return execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], { encoding: "utf8" }).trim()
}

function installWindowsPath(entry: string) {
  const existing = powerShell("[Environment]::GetEnvironmentVariable('Path', 'User')")
  const result = pathEntry(existing, entry, "windows")
  if (result.added) {
    const encoded = result.value.replaceAll("'", "''")
    powerShell(`[Environment]::SetEnvironmentVariable('Path', '${encoded}', 'User')`)
  }
}

function shellRc(home: string): string {
  const configured = process.env.ROUTER_SKILLS_SHELL_RC
  if (configured) return configured
  const shell = (process.env.SHELL ?? "").split("/").pop()
  return nodePath.join(home, shell === "zsh" ? ".zshrc" : shell === "bash" ? ".bashrc" : ".profile")
}

export function installLauncher(platform: LauncherPlatform, repoPath: string, home: string, runtimePath: string) {
  const directory = binDir(home, platform)
  const launcher = launcherPath(home, platform)
  mkdirSync(directory, { recursive: true })
  writeFileSync(launcher, launcherContent(platform, repoPath, runtimePath), "utf8")

  if (platform === "windows") {
    installWindowsPath(directory)
  } else {
    const config = shellRc(home)
    const existing = existsSync(config) ? readFileSync(config, "utf8") : ""
    writeFileSync(config, appendPosixPathConfig(existing, posixPathBlock(directory)), "utf8")
    chmodSync(launcher, 0o755)
  }
  return { directory, launcher }
}

function main() {
  const args = new Map<string, string>()
  for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1] ?? "")
  const platform = args.get("--platform") as LauncherPlatform
  const repoPath = args.get("--repo-path")
  if (platform !== "windows" && platform !== "posix") throw new Error("launcher installer needs --platform")
  const home = platform === "windows" ? (process.env.USERPROFILE ?? process.env.HOME) : process.env.HOME
  if (!home) throw new Error("could not determine the user home directory")
  if (args.has("--session-path")) {
    const entry = args.get("--bin-dir") ?? binDir(home, platform)
    console.log(updatedSessionPath(process.env.Path ?? process.env.PATH ?? "", entry, platform))
    return
  }
  if (!repoPath) throw new Error("launcher installer needs --repo-path")
  const runtime = whichSync("bun")
  if (!runtime) throw new Error("Bun was not found after installation. Install Bun from https://bun.sh and re-run.")
  const result = installLauncher(platform, repoPath, home, runtime)
  console.log(`router-skills launcher installed at ${result.launcher}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
