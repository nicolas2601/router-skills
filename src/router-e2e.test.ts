import { test, expect } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

/**
 * K4: real end-to-end reproduction of the "turn 1 on a fresh install is a total silence
 * hole" bug — spawns the ACTUAL `skill-gate-eval.mjs` hook as a real child process (not
 * `main(stdin, deps)`, since this script is a legacy top-level-await entrypoint, not yet
 * deps-injected) against a genuinely fresh, empty `$HOME` with only a skill fixture
 * dropped in, exactly like a brand-new install. No `.router-cache/skills-index.tsv`
 * exists yet anywhere under this HOME — this is the exact cold-start scenario.
 *
 * Pre-fix (verified manually — see apply-progress notes): with the `ensureGateIndex()`
 * call removed, `.router-cache/` is never even created; `scoreSkills` reads a
 * non-existent index -> `[]` -> the fixture skill is NOT MENTIONED ANYWHERE in the
 * printed output — no REQUIRED_SKILLS, no SUGGESTED_SKILLS, nothing. Total, genuine
 * silence on turn 1, self-healing only from turn 2 onward once `skill-router.mjs`
 * (which DID already build the index) has run at least once. This test proves the fix:
 * turn 1 now finds the fixture skill immediately, because `skill-gate-eval.mjs` builds
 * the index itself (K4b) before scoring — no second turn required, and the index file
 * genuinely gets created as a side effect of THIS single invocation (K4a's atomic write).
 */
test("K4 e2e: turn 1 on a fresh $HOME evaluates real skills immediately, never silently empty", () => {
  const home = mkdtempSync(join(tmpdir(), "skillforge-freshhome-"))
  const skillsDir = join(home, ".claude", "skills", "turbo-cache")
  mkdirSync(skillsDir, { recursive: true })
  writeFileSync(
    join(skillsDir, "SKILL.md"),
    ["---", 'description: "cache cache cache invalidation layer"', "---", "", "# Turbo Cache", ""].join("\n"),
  )

  try {
    const evalScript = join(ROOT, "gate", "claude", "skill-gate-eval.mjs")
    const prompt = "please cache it correctly today"
    const sessionId = "e2e-turn1"

    // Precondition: genuinely NO index anywhere under this fresh $HOME yet — the exact
    // cold-start turn-1 scenario, not a warm/self-healed state from a prior turn.
    const idxPath = join(home, ".claude", ".router-cache", "skills-index.tsv")
    expect(existsSync(idxPath)).toBe(false)

    // W12: the suite's own hermeticity rule forbids spreading ambient `process.env` — a
    // future CI-wide env var (e.g. `SKILLFORGE_NPX_FIND=1`) would silently make this test
    // spawn real network calls. Only the vars this child process genuinely needs (`HOME` to
    // resolve the fresh install, `PATH` to find the node/bun runtime) are forwarded
    // explicitly — plus `USERPROFILE` (W10, Windows): node's os.homedir() reads
    // USERPROFILE on win32, NOT HOME, so without it this test's scratch $HOME was silently
    // ignored on Windows and `defaultDeps()` fell back to the real runner profile dir.
    const result = spawnSync(process.execPath, [evalScript], {
      input: JSON.stringify({ prompt, session_id: sessionId }),
      env: { HOME: home, USERPROFILE: home, PATH: process.env.PATH },
      encoding: "utf8",
      timeout: 20_000,
    })

    expect(result.status).toBe(0)
    expect(result.stderr || "").toBe("")

    // Core assertion (K4b): the fixture skill — which the fresh $HOME has installed and
    // which genuinely matches this prompt — must be MENTIONED somewhere in the printed
    // output on THIS FIRST TURN. Pre-fix, `scoreSkills` scored against a non-existent
    // index and the skill was never mentioned at all (verified manually: RED, see
    // apply-progress.md). Post-fix, `ensureGateIndex()` builds the index before scoring,
    // so the real, freshly-built index is what gets scored — never an empty stand-in.
    const stdout = result.stdout || ""
    expect(stdout).toContain("turbo-cache")

    // The index file itself must now exist on disk — proving the cold build genuinely
    // happened as a side effect of THIS single hook invocation, not a no-op left for
    // some later turn to discover.
    expect(existsSync(idxPath)).toBe(true)

    // The gate contract file must exist too (piece 1's deterministic contract, written
    // every turn regardless of required/suggested split).
    const requiredPath = join(home, ".claude", ".skillgate", `${sessionId}.required.json`)
    expect(existsSync(requiredPath)).toBe(true)
    const contract = JSON.parse(readFileSync(requiredPath, "utf8")) as { required: string[]; ts: number }
    expect(Array.isArray(contract.required)).toBe(true)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
