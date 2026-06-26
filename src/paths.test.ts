import { test, expect } from "bun:test"
import nodePath from "node:path"
import { claudeHookPath, claudeSettings, claudeSkillsDir, opencodePlugin, opencodeConfig } from "./paths.ts"

const win = nodePath.win32
const posix = nodePath.posix

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
test("windows: opencode plugin", () => {
  expect(opencodePlugin("C:\\Users\\nico", win)).toBe("C:\\Users\\nico\\.config\\opencode\\plugins\\skill-enforcer.ts")
})
test("windows: opencode config", () => {
  expect(opencodeConfig("C:\\Users\\nico", win)).toBe("C:\\Users\\nico\\.config\\opencode\\opencode.json")
})

// posix sanity
test("posix: claude hook path", () => {
  expect(claudeHookPath("/home/nico", posix)).toBe("/home/nico/.claude/hooks/skill-forced-eval.mjs")
})
test("posix: opencode plugin", () => {
  expect(opencodePlugin("/home/nico", posix)).toBe("/home/nico/.config/opencode/plugins/skill-enforcer.ts")
})
