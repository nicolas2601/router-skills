import { test, expect } from "bun:test"
import nodePath from "node:path"
import {
  claudeHookPath, claudeSettings, claudeSkillsDir, claudeAgentsDir, opencodeBase, opencodePlugin,
  opencodeConfig, opencodeAgentsDir, opencodeRuleFile,
  routerCacheDir, skillsIndexPath, agentsIndexPath, lastSuggestion, npxCacheDir, routerStateDir,
  claudeRouterCore, claudeSkillRouter, claudeUsageTracker, projectSlug, memoryDirs,
} from "./paths.ts"

const win = nodePath.win32
const posix = nodePath.posix

// Hermetic env. Never let the ambient process.env reach these tests: CI runners set
// XDG_CONFIG_HOME, which would override the `home` argument and make paths depend on
// where the suite happens to run.
const noXdg = {}

// Windows path construction (tested from any host via path.win32)
test("windows: claude hook path", () => {
  expect(claudeHookPath("C:\\Users\\nico", win)).toBe("C:\\Users\\nico\\.claude\\hooks\\skill-forced-eval.mjs")
})
test("windows: claude settings", () => {
  expect(claudeSettings("C:\\Users\\nico", win)).toBe("C:\\Users\\nico\\.claude\\settings.json")
})
test("windows: claude skills dir", () => {
  expect(claudeSkillsDir("C:\\Users\\nico", win)).toBe("C:\\Users\\nico\\.claude\\skills")
})
test("windows: claude agents dir", () => {
  expect(claudeAgentsDir("C:\\Users\\nico", win)).toBe("C:\\Users\\nico\\.claude\\agents")
})
test("windows: opencode agents dir", () => {
  expect(opencodeAgentsDir("C:\\Users\\nico", win, noXdg)).toBe("C:\\Users\\nico\\.config\\opencode\\agents")
})
test("windows: opencode rule file", () => {
  expect(opencodeRuleFile("C:\\Users\\nico", win, noXdg)).toBe("C:\\Users\\nico\\.config\\opencode\\skill-enforcement.md")
})
test("windows: opencode plugin", () => {
  expect(opencodePlugin("C:\\Users\\nico", win, noXdg)).toBe("C:\\Users\\nico\\.config\\opencode\\plugins\\skill-enforcer.ts")
})
test("windows: opencode config", () => {
  expect(opencodeConfig("C:\\Users\\nico", win, noXdg)).toBe("C:\\Users\\nico\\.config\\opencode\\opencode.json")
})

// posix sanity
test("posix: claude hook path", () => {
  expect(claudeHookPath("/home/nico", posix)).toBe("/home/nico/.claude/hooks/skill-forced-eval.mjs")
})
test("posix: opencode plugin", () => {
  expect(opencodePlugin("/home/nico", posix, noXdg)).toBe("/home/nico/.config/opencode/plugins/skill-enforcer.ts")
})
test("posix: claude agents dir", () => {
  expect(claudeAgentsDir("/home/nico", posix)).toBe("/home/nico/.claude/agents")
})
test("posix: opencode agents dir", () => {
  expect(opencodeAgentsDir("/home/nico", posix, noXdg)).toBe("/home/nico/.config/opencode/agents")
})

// XDG_CONFIG_HOME support — the v0.6.0 feature. It was shipped without a test, so
// nothing caught that the derived helpers dropped `env` on the way to opencodeBase.
test("xdg: XDG_CONFIG_HOME overrides home", () => {
  const env = { XDG_CONFIG_HOME: "/custom/cfg" }
  expect(opencodeBase("/home/nico", posix, env)).toBe("/custom/cfg/opencode")
})
test("xdg: derived paths honor XDG_CONFIG_HOME", () => {
  const env = { XDG_CONFIG_HOME: "/custom/cfg" }
  expect(opencodeAgentsDir("/home/nico", posix, env)).toBe("/custom/cfg/opencode/agents")
  expect(opencodePlugin("/home/nico", posix, env)).toBe("/custom/cfg/opencode/plugins/skill-enforcer.ts")
  expect(opencodeConfig("/home/nico", posix, env)).toBe("/custom/cfg/opencode/opencode.json")
  expect(opencodeRuleFile("/home/nico", posix, env)).toBe("/custom/cfg/opencode/skill-enforcement.md")
})

// T015 (AC-9): new router-core path builders, injectable PathImpl.
test("windows: skills index path", () => {
  expect(skillsIndexPath("C:\\Users\\nico", win)).toBe(
    "C:\\Users\\nico\\.claude\\.router-cache\\skills-index.tsv"
  )
})
test("posix: router cache dir", () => {
  expect(routerCacheDir("/home/nico", posix)).toBe("/home/nico/.claude/.router-cache")
})
test("posix: agents index path", () => {
  expect(agentsIndexPath("/home/nico", posix)).toBe("/home/nico/.claude/.router-cache/agents-index.tsv")
})
test("posix: last suggestion path", () => {
  expect(lastSuggestion("/home/nico", posix)).toBe("/home/nico/.claude/.router-cache/last-suggestion.json")
})
test("posix: npx cache dir", () => {
  expect(npxCacheDir("/home/nico", posix)).toBe("/home/nico/.claude/.router-cache/npx-cache")
})
test("posix: router state dir", () => {
  expect(routerStateDir("/home/nico", posix)).toBe("/home/nico/.claude/.router-cache/state")
})
// router-core lives in .claude/core/, NOT hooks/ — the shipped hooks import it as
// `../core/router-core.mjs`. This test used to assert hooks/, which encoded the bug that
// made every hook die with ERR_MODULE_NOT_FOUND on every prompt.
test("posix: claude router core lives in core/, where the hooks import it from", () => {
  expect(claudeRouterCore("/home/nico", posix)).toBe("/home/nico/.claude/core/router-core.mjs")
})
test("windows: claude router core lives in core/", () => {
  expect(claudeRouterCore("C:\\Users\\nico", win)).toBe("C:\\Users\\nico\\.claude\\core\\router-core.mjs")
})
test("posix: claude skill router hook path", () => {
  expect(claudeSkillRouter("/home/nico", posix)).toBe("/home/nico/.claude/hooks/skill-router.mjs")
})
test("posix: claude usage tracker hook path", () => {
  expect(claudeUsageTracker("/home/nico", posix)).toBe("/home/nico/.claude/hooks/skill-usage-tracker.mjs")
})

// T016 (AC-7): projectSlug — one hyphen per non-alnum char, no collapsing.
test("projectSlug: one hyphen per non-alnum char, no collapsing (AC-7)", () => {
  expect(projectSlug("/home/nico")).toBe("-home-nico")
  expect(projectSlug("C:\\Users\\nico")).toBe("C--Users-nico")
  // Non-ASCII edge case: an accented char is replaced like any other special char.
  expect(projectSlug("/home/nicolás")).toBe("-home-nicol-s")
})

// T017 (AC-7/AC-9): memoryDirs — pure candidates, most-specific first, derived from cwd.
test("memoryDirs: candidates derived from cwd, win32 exact string (AC-7)", () => {
  const dirs = memoryDirs("C:\\Users\\u", "C:\\proj\\app", win)
  expect(dirs[0]).toBe("C:\\Users\\u\\.claude\\projects\\C--proj-app\\memory")
  expect(dirs[1]).toBe(routerStateDir("C:\\Users\\u", win))

  // Slug is derived from cwd, not home (home !== cwd fixture).
  const dirs2 = memoryDirs("/home/u", "/home/u/projects/app", posix)
  expect(dirs2[0]).toBe("/home/u/.claude/projects/-home-u-projects-app/memory")
})
