import { test, expect } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { ensureIndex, defaultDeps, CHANGE_CHECK_TTL_MS } from "../gate/core/router-core.mjs"

/**
 * Detecting "did any skill change?" means stat-ing every SKILL.md — ~1800 stats on a real
 * install. That ran on EVERY prompt, in BOTH hooks: ~470ms of latency per turn, just to ask
 * a question whose answer is almost always "no".
 *
 * Throttle the question. The index is still rebuilt the instant a change IS detected; we
 * simply stop re-asking on every keystroke.
 *
 * The trade-off, stated plainly: a skill installed or edited right now can take up to
 * CHANGE_CHECK_TTL_MS before the router sees it. That is the price, and it is the right one
 * — nobody installs a skill and needs it routed in the same second, but everybody pays the
 * latency on every prompt.
 */

function fakeHome() {
  const home = mkdtempSync(path.join(tmpdir(), "skillforge-ttl-"))
  const skills = path.join(home, ".claude", "skills")
  mkdirSync(path.join(skills, "alpha"), { recursive: true })
  writeFileSync(path.join(skills, "alpha", "SKILL.md"), "---\nname: alpha\ndescription: does alpha\n---\n")
  return home
}

test("the TTL is a real window, not effectively-zero", () => {
  expect(CHANGE_CHECK_TTL_MS).toBeGreaterThanOrEqual(10_000)
})

test("a warm second call does not walk the skills tree at all", () => {
  const home = fakeHome()
  try {
    // Count only the touches that scale with the CATALOGUE — the ~1800 stats that made this
    // 240ms. Counting every stat would drown that signal in the handful of constant-cost
    // ones (the index file, the stamp) that a warm call legitimately still makes.
    const skillsDir = path.join(home, ".claude", "skills")
    let treeTouches = 0
    const real = defaultDeps()
    const deps = {
      ...real,
      home,
      fs: {
        ...real.fs,
        statSync: (p: string) => {
          // Entries INSIDE the catalogue — the O(n) walk. The single stat of the skills dir
          // itself is O(1) ("does this dir exist?") and is not what made this slow.
          if (p.startsWith(skillsDir + path.sep)) treeTouches++
          return real.fs.statSync(p)
        },
      },
    }

    ensureIndex(deps) // cold: must build, so it must walk
    expect(treeTouches).toBeGreaterThan(0)

    treeTouches = 0
    ensureIndex(deps) // warm, inside the TTL: must not walk at all
    expect(treeTouches).toBe(0)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test("a change past the TTL is still picked up — throttling must not mean blindness", () => {
  const home = fakeHome()
  try {
    const real = defaultDeps()
    let clock = 1_000_000
    const deps = { ...real, home, now: () => clock }

    expect(ensureIndex(deps).skills).toBe(1)

    const skills = path.join(home, ".claude", "skills")
    mkdirSync(path.join(skills, "beta"), { recursive: true })
    writeFileSync(path.join(skills, "beta", "SKILL.md"), "---\nname: beta\ndescription: does beta\n---\n")

    clock += CHANGE_CHECK_TTL_MS + 1
    expect(ensureIndex(deps).skills).toBe(2)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
