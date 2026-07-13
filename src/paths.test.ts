import { test, expect } from "bun:test"
import nodePath from "node:path"
import { claudeHookPath, claudeSettings, claudeSkillsDir, claudeAgentsDir, opencodeBase, opencodePlugin, opencodeConfig, opencodeAgentsDir, opencodeRuleFile } from "./paths.ts"

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
