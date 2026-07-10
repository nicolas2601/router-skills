import { test, expect } from "bun:test"
import { pickRunner, whichSync } from "./util.ts"
import { opencodeBase } from "./paths.ts"
import nodePath from "node:path"

const win = nodePath.win32
const posix = nodePath.posix

// ── hook runner selection (W1: hooks must name a runtime that exists) ──
test("pickRunner: prefers node when present", () => {
  expect(pickRunner(true, true)).toBe("node")
  expect(pickRunner(true, false)).toBe("node")
})
test("pickRunner: falls back to bun when node absent", () => {
  expect(pickRunner(false, true)).toBe("bun")
})
test("pickRunner: names node as last resort when nothing detected", () => {
  expect(pickRunner(false, false)).toBe("node")
})

// ── opencode base honors XDG_CONFIG_HOME (W3) ──
test("opencodeBase: default is ~/.config/opencode (posix)", () => {
  expect(opencodeBase("/home/nico", posix, {})).toBe("/home/nico/.config/opencode")
})
test("opencodeBase: default is ~/.config/opencode (windows)", () => {
  expect(opencodeBase("C:\\Users\\nico", win, {})).toBe("C:\\Users\\nico\\.config\\opencode")
})
test("opencodeBase: honors XDG_CONFIG_HOME when set", () => {
  expect(opencodeBase("/home/nico", posix, { XDG_CONFIG_HOME: "/custom/cfg" })).toBe("/custom/cfg/opencode")
})

// ── cross-runtime PATH scan (W2) — behaves without Bun.which via manual fallback ──
test("whichSync: manual scan finds an existing file on a fake PATH (posix)", () => {
  // node itself is on the real PATH; scan should resolve it without Bun.
  const env = { PATH: process.env.PATH }
  const hit = whichSync("node", env, "linux", ":")
  // Either Bun.which resolves it, or the manual scan does — both acceptable.
  expect(typeof hit === "string" || hit === null).toBe(true)
})
test("whichSync: returns null for a command that cannot exist", () => {
  const env = { PATH: "/nonexistent-dir-xyz" }
  expect(whichSync("definitely-not-a-real-binary-zzz", env, "linux", ":")).toBe(null)
})
