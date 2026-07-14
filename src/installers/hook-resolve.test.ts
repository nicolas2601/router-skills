import { test, expect } from "bun:test"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { ROUTER_CORE_MJS, LEXICON_MJS, GATE_LIB_MJS, SKILL_ROUTER_MJS, USAGE_TRACKER_MJS } from "../templates.ts"
import { claudeRouterCore, claudeLexicon, claudeGateLib, claudeSkillRouter, claudeUsageTracker } from "../paths.ts"

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
    // router-core imports ./lexicon.mjs. Forget to install it and every hook dies with
    // ERR_MODULE_NOT_FOUND again — the exact bug this file exists to prevent.
    [claudeLexicon(home), LEXICON_MJS],
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

// Resolve with the SAME PathImpl the paths were built with. Using the native `path` here
// against a POSIX fixture is how this test failed on the Windows runner — the same
// platform-leak that broke the XDG tests earlier: an assertion that silently depends on
// which OS happens to run it.
test.each([
  ["posix", path.posix, "/home/nico"],
  ["win32", path.win32, "C:\\Users\\nico"],
] as const)("router-core lands where the hooks import it from (%s)", (_name, impl, home) => {
  const core = claudeRouterCore(home, impl)
  const lib = claudeGateLib(home, impl)
  // The hooks say `../core/router-core.mjs`. Resolved against the installed lib, that must
  // land exactly on the file the installer wrote.
  const resolved = impl.join(impl.dirname(lib), "..", "core", "router-core.mjs")
  expect(resolved).toBe(core)
})
