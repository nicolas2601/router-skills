/**
 * Pure, platform-injectable path builders.
 * Default to the runtime `node:path` (correct for the host OS), but accept an
 * explicit path impl so Windows path construction can be unit-tested on Linux
 * via `path.win32` (and vice-versa).
 */
import nodePath from "node:path"

type PathImpl = Pick<typeof nodePath, "join">

export const claudeDir = (home: string, p: PathImpl = nodePath) => p.join(home, ".claude")
export const claudeHooksDir = (home: string, p: PathImpl = nodePath) => p.join(claudeDir(home, p), "hooks")
export const claudeHookPath = (home: string, p: PathImpl = nodePath) =>
  p.join(claudeHooksDir(home, p), "skill-forced-eval.mjs")
// Skill-gate files (v2 enforcement): shared lib + 3 wired hooks.
export const claudeGateLib = (home: string, p: PathImpl = nodePath) =>
  p.join(claudeHooksDir(home, p), "skill-gate-lib.mjs")
export const claudeGateEval = (home: string, p: PathImpl = nodePath) =>
  p.join(claudeHooksDir(home, p), "skill-gate-eval.mjs")
export const claudeGateTrack = (home: string, p: PathImpl = nodePath) =>
  p.join(claudeHooksDir(home, p), "skill-gate-track.mjs")
export const claudeGateStop = (home: string, p: PathImpl = nodePath) =>
  p.join(claudeHooksDir(home, p), "skill-gate-stop.mjs")
export const claudeSettings = (home: string, p: PathImpl = nodePath) => p.join(claudeDir(home, p), "settings.json")
export const claudeSkillsDir = (home: string, p: PathImpl = nodePath) => p.join(claudeDir(home, p), "skills")
export const claudeAgentsDir = (home: string, p: PathImpl = nodePath) => p.join(claudeDir(home, p), "agents")
/** Global memory file — Claude Code loads it in every session, any cwd. */
export const claudeGlobalMd = (home: string, p: PathImpl = nodePath) => p.join(claudeDir(home, p), "CLAUDE.md")

// Router/tracker port (router-port-cross-platform): cache dir + derived index/state
// paths, and the 3 new hook files. Mirrors the `claudeGateLib` pattern exactly.
export const routerCacheDir = (home: string, p: PathImpl = nodePath) => p.join(claudeDir(home, p), ".router-cache")
export const skillsIndexPath = (home: string, p: PathImpl = nodePath) =>
  p.join(routerCacheDir(home, p), "skills-index.tsv")
export const agentsIndexPath = (home: string, p: PathImpl = nodePath) =>
  p.join(routerCacheDir(home, p), "agents-index.tsv")
export const lastSuggestion = (home: string, p: PathImpl = nodePath) =>
  p.join(routerCacheDir(home, p), "last-suggestion.json")
export const npxCacheDir = (home: string, p: PathImpl = nodePath) => p.join(routerCacheDir(home, p), "npx-cache")
export const routerStateDir = (home: string, p: PathImpl = nodePath) => p.join(routerCacheDir(home, p), "state")
/**
 * router-core lives in ~/.claude/core/, NOT in hooks/.
 *
 * The hooks import it as `../core/router-core.mjs` — a specifier that is relative to the
 * repo layout (gate/claude/ -> gate/core/). Writing all seven files flat into hooks/ made
 * that specifier resolve to ~/.claude/core/, which did not exist, and every hook died with
 * ERR_MODULE_NOT_FOUND on every prompt. Mirroring the source layout on disk keeps the
 * specifier honest and needs no rewriting of the shipped code.
 */
export const claudeCoreDir = (home: string, p: PathImpl = nodePath) => p.join(claudeDir(home, p), "core")
export const claudeRouterCore = (home: string, p: PathImpl = nodePath) =>
  p.join(claudeCoreDir(home, p), "router-core.mjs")
export const claudeSkillRouter = (home: string, p: PathImpl = nodePath) =>
  p.join(claudeHooksDir(home, p), "skill-router.mjs")
export const claudeUsageTracker = (home: string, p: PathImpl = nodePath) =>
  p.join(claudeHooksDir(home, p), "skill-usage-tracker.mjs")

/**
 * Slug = absolute cwd, every char that is not an ASCII letter/digit replaced
 * 1-for-1 with `-` (no collapsing of consecutive hyphens). Example:
 * `/home/user` -> `-home-user`. Non-ASCII (e.g. accented Latin-1/UTF-8 in a
 * Windows username) is replaced like any other special char — deliberate, not an
 * oversight (avoids OS-specific filesystem encoding issues in the derived path).
 */
export const projectSlug = (cwd: string) => cwd.replace(/[^A-Za-z0-9]/g, "-")

/**
 * Candidate memory dirs, most-specific first. PURE — existence is decided by the
 * caller (the impure `memoryDir` wrapper lives in `gate/core/router-core.mjs`,
 * which needs `fs.existsSync`).
 */
export const memoryDirs = (home: string, cwd: string, p: PathImpl = nodePath) => [
  p.join(claudeDir(home, p), "projects", projectSlug(cwd), "memory"),
  routerStateDir(home, p),
]

/**
 * opencode's global config dir. Mirrors opencode's own resolution
 * (`packages/core/src/global.ts` → xdg-basedir): `$XDG_CONFIG_HOME/opencode`, else
 * `~/.config/opencode` on EVERY OS (xdg-basedir does not use %APPDATA% on Windows).
 * Honoring XDG_CONFIG_HOME is required — without it we'd write to the wrong dir whenever
 * the user (or their shell) sets it. `env` is injectable for tests.
 */
type Env = Record<string, string | undefined>

export const opencodeBase = (home: string, p: PathImpl = nodePath, env: Env = process.env) => {
  const xdg = env.XDG_CONFIG_HOME
  return xdg ? p.join(xdg, "opencode") : p.join(home, ".config", "opencode")
}
// Every derived path must forward `env` to opencodeBase. If it falls back to the
// default `process.env`, an ambient XDG_CONFIG_HOME silently overrides the caller's
// `home` — which is exactly what made these paths untestable on CI runners.
export const opencodePluginsDir = (home: string, p: PathImpl = nodePath, env: Env = process.env) =>
  p.join(opencodeBase(home, p, env), "plugins")
export const opencodePlugin = (home: string, p: PathImpl = nodePath, env: Env = process.env) =>
  p.join(opencodePluginsDir(home, p, env), "skill-enforcer.ts")
export const opencodeConfig = (home: string, p: PathImpl = nodePath, env: Env = process.env) =>
  p.join(opencodeBase(home, p, env), "opencode.json")
export const opencodeAgentsDir = (home: string, p: PathImpl = nodePath, env: Env = process.env) =>
  p.join(opencodeBase(home, p, env), "agents")
export const opencodeRuleFile = (home: string, p: PathImpl = nodePath, env: Env = process.env) =>
  p.join(opencodeBase(home, p, env), "skill-enforcement.md")
/** Global rules file — opencode reads it in every session, any cwd. */
export const opencodeAgentsMd = (home: string, p: PathImpl = nodePath, env: Env = process.env) =>
  p.join(opencodeBase(home, p, env), "AGENTS.md")
