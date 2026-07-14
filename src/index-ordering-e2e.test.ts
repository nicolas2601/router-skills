import { test, expect } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdtempSync, mkdirSync, readFileSync, existsSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

/**
 * W1: `installClaude(DRY)` used to pre-build the skill/agent index INSIDE itself — and the
 * orchestrator (`main()` in this file) called `installClaude` BEFORE `installSkills`/
 * `installAgents`, the steps that actually POPULATE `~/.claude/skills`/`~/.claude/agents`.
 * On a genuinely fresh machine the pre-build therefore always ran against an EMPTY skills
 * dir and produced 0 rows — the reported "no skills found yet — will build on first
 * prompt" reads benign but really means "this pre-build did nothing at all". Claude Code
 * self-heals on the next prompt (K4b); opencode does NOT (C1) — a genuinely useless
 * pre-build masked a real gap for opencode-only installs.
 *
 * Real end-to-end reproduction: runs the ACTUAL CLI (`bun run src/index.ts --yes`) against
 * a genuinely fresh, empty scratch $HOME — the real bundled `skills/`/`agents/` packs get
 * linked for real, and the on-disk index this run produces is inspected directly.
 */
test("CLI: the skill/agent index pre-build runs AFTER skills/agents are linked — rows > 0 on a fresh install (W1)", () => {
  const home = mkdtempSync(join(tmpdir(), "skillforge-w1-order-"))
  try {
    // Hermeticity: `detectTargets()` (src/detect.ts) treats a CLI as "present" when EITHER
    // its config dir exists under $HOME OR its binary resolves on $PATH. This test's intent
    // is "run the real installer end-to-end against a fresh Claude Code install" — it must
    // NOT silently depend on whether the HOST machine happens to have `claude`/`opencode`
    // installed/on PATH. A bare CI runner has neither, so `detectTargets()` legitimately
    // returns zero present targets and the CLI exits 1 with "No supported CLI found" —
    // confirmed locally by spawning the real CLI against a fresh $HOME with a PATH stripped
    // of claude/opencode (see apply-progress.md for the raw output). Pre-creating an empty
    // `~/.claude` here makes "claude" deterministically present regardless of host PATH
    // state, so this test exercises the SAME scenario on every machine, dev or CI.
    mkdirSync(join(home, ".claude"), { recursive: true })

    const result = spawnSync(process.execPath, ["run", join(ROOT, "src/index.ts"), "--yes"], {
      // W10 (Windows): node's os.homedir() reads USERPROFILE on win32, NOT HOME (POSIX-only)
      // — see gate-scripts-e2e.test.ts's W7 comment for the full mechanism. Forwarding both
      // makes `src/util.ts`'s `export const HOME = homedir()` resolve to this scratch $HOME
      // on every OS, not silently fall back to the real runner profile on Windows.
      env: { HOME: home, USERPROFILE: home, PATH: process.env.PATH },
      input: "",
      encoding: "utf8",
      timeout: 60_000,
    })

    // A silent, unexplained non-zero exit here is exactly the failure mode this whole change
    // was hunting: paste the real stdout/stderr instead of leaving the next reader to guess.
    if (result.status !== 0) {
      throw new Error(
        `CLI exited ${result.status} (signal: ${result.signal}), expected 0.\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`,
      )
    }
    expect(result.status).toBe(0)

    const idxPath = join(home, ".claude", ".router-cache", "skills-index.tsv")
    expect(existsSync(idxPath)).toBe(true)
    const rows = readFileSync(idxPath, "utf8").split("\n").filter((l) => l.trim()).length
    // The precise failure mode this test guards: pre-fix, this pre-build ran BEFORE the
    // skills pack was linked, so `rows` was always 0 on a fresh $HOME even though the
    // bundled skill pack genuinely got linked moments later in the SAME run.
    expect(rows).toBeGreaterThan(0)

    // The printed action must reflect a REAL, non-empty pre-build, not the old
    // "no skills found yet" message that (pre-fix) was the expected, permanent outcome on
    // a fresh install.
    expect(result.stdout).toContain("skills,")
    expect(result.stdout).toContain("agents indexed")
    expect(result.stdout).not.toContain("no skills found yet")
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
