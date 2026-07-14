import { test, expect } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { countSkillRows, countAgentRows, buildSkillIndex, defaultDeps } from "../gate/core/router-core.mjs"

/**
 * `needsRebuild` only ever wanted a COUNT — "did a skill get deleted?" — but it got that
 * count by calling computeSkillRows(), which readFileSync's and frontmatter-parses every
 * single SKILL.md. On a real 1300-skill install that is ~1800 file reads, on EVERY prompt,
 * in BOTH hooks: ~240ms of pure waste per hook, per turn, to learn one integer.
 *
 * The count is decidable from directory structure alone. The contract that matters is that
 * the cheap count and the expensive one never disagree — if they did, the router would
 * rebuild forever or never.
 */

function fakeHome() {
  const home = mkdtempSync(path.join(tmpdir(), "skillforge-count-"))
  const skills = path.join(home, ".claude", "skills")
  for (const name of ["alpha", "beta", "gamma"]) {
    mkdirSync(path.join(skills, name), { recursive: true })
    writeFileSync(path.join(skills, name, "SKILL.md"), `---\nname: ${name}\ndescription: does ${name}\n---\n`)
  }
  // Noise that must NOT be counted: a dir with no SKILL.md, and a loose file.
  mkdirSync(path.join(skills, "not-a-skill"), { recursive: true })
  writeFileSync(path.join(skills, "README.md"), "hi")
  return home
}

function depsFor(home: string) {
  return { ...defaultDeps(), home }
}

test("the cheap count agrees with the expensive one", () => {
  const home = fakeHome()
  try {
    const deps = depsFor(home)
    const built = buildSkillIndex(deps)
    expect(countSkillRows(deps)).toBe(built.rows)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test("only directories holding a SKILL.md are counted", () => {
  const home = fakeHome()
  try {
    expect(countSkillRows(depsFor(home))).toBe(3)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test("counting never reads file contents — a missing skills dir counts as zero, not a crash", () => {
  const home = mkdtempSync(path.join(tmpdir(), "skillforge-empty-"))
  try {
    expect(countSkillRows(depsFor(home))).toBe(0)
    expect(countAgentRows(depsFor(home))).toBe(0)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
