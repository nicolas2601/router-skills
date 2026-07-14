import { test, expect } from "bun:test"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { ROUTER_CORE_MJS, GATE_LIB_MJS, SKILL_ROUTER_MJS, USAGE_TRACKER_MJS } from "../templates.ts"
import { claudeRouterCore, claudeGateLib, claudeSkillRouter, claudeUsageTracker } from "../paths.ts"

/**
 * The gap that shipped a broken router.
 *
 * Every unit test imported `gate/core/router-core.mjs` by path, so the scorer was
 * covered — and the WIRING was not. The hooks import it as `../core/router-core.mjs`,
 * relative to the repo layout (gate/claude/ -> gate/core/), but the installer wrote all
 * seven files FLAT into ~/.claude/hooks/. So `../core/` resolved to ~/.claude/core/,
 * which did not exist, and every hook died with ERR_MODULE_NOT_FOUND on every prompt.
 *
 * Green unit tests, dead product. This test loads the hooks the way Node actually loads
 * them: from the installed layout, through their real entry points.
 */

function installToTempHome() {
  const home = mkdtempSync(path.join(tmpdir(), "skillforge-hooks-"))
  for (const [file, body] of [
    [claudeRouterCore(home), ROUTER_CORE_MJS],
    [claudeGateLib(home), GATE_LIB_MJS],
    [claudeSkillRouter(home), SKILL_ROUTER_MJS],
    [claudeUsageTracker(home), USAGE_TRACKER_MJS],
  ] as const) {
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, body)
  }
  return home
}

test("every installed hook resolves its router-core import", async () => {
  const home = installToTempHome()
  try {
    // If the import specifier and the installed layout disagree, this throws
    // ERR_MODULE_NOT_FOUND — exactly what users hit on every prompt.
    for (const hook of [claudeGateLib(home), claudeSkillRouter(home), claudeUsageTracker(home)]) {
      await import(/* @vite-ignore */ `file://${hook}?t=${home}`)
    }
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test("router-core lands where the hooks import it from", () => {
  const home = "/home/nico"
  const core = claudeRouterCore(home)
  const lib = claudeGateLib(home)
  // The hooks say `../core/router-core.mjs`. Resolve that against the installed lib
  // and it must land on the file the installer actually wrote.
  const resolved = path.resolve(path.dirname(lib), "../core/router-core.mjs")
  expect(resolved).toBe(core)
})
