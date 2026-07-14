import { test, expect } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs"
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
    const result = spawnSync(process.execPath, ["run", join(ROOT, "src/index.ts"), "--yes"], {
      env: { HOME: home, PATH: process.env.PATH },
      input: "",
      encoding: "utf8",
      timeout: 60_000,
    })

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
