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
