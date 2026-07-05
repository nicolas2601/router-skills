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
export const claudeSettings = (home: string, p: PathImpl = nodePath) => p.join(claudeDir(home, p), "settings.json")
export const claudeSkillsDir = (home: string, p: PathImpl = nodePath) => p.join(claudeDir(home, p), "skills")
export const claudeAgentsDir = (home: string, p: PathImpl = nodePath) => p.join(claudeDir(home, p), "agents")

export const opencodeBase = (home: string, p: PathImpl = nodePath) => p.join(home, ".config", "opencode")
export const opencodePluginsDir = (home: string, p: PathImpl = nodePath) => p.join(opencodeBase(home, p), "plugins")
export const opencodePlugin = (home: string, p: PathImpl = nodePath) =>
  p.join(opencodePluginsDir(home, p), "skill-enforcer.ts")
export const opencodeConfig = (home: string, p: PathImpl = nodePath) => p.join(opencodeBase(home, p), "opencode.json")
export const opencodeAgentsDir = (home: string, p: PathImpl = nodePath) => p.join(opencodeBase(home, p), "agents")
export const opencodeRuleFile = (home: string, p: PathImpl = nodePath) =>
  p.join(opencodeBase(home, p), "skill-enforcement.md")
