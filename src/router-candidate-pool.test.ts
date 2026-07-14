import { test, expect } from "bun:test"
import { scoreRouter, classify, STRONG } from "../gate/core/router-core.mjs"

/**
 * scoreRouter used to end with `rows.slice(0, 3)` — a hard cap of three candidates,
 * inherited faithfully from the bash original's `head -3`.
 *
 * That cap made the documented contract false. The README promises "REQUIRED (capped) /
 * SUGGESTED (uncapped) — if five skills genuinely help, all five are surfaced", but
 * classify() never saw more than three rows, so a complementary skill ranked fourth was
 * discarded before anyone could suggest it.
 *
 * Widening the pool does NOT loosen enforcement: `required` is decided by a SCORE threshold
 * (>= STRONG), not by rank, so a wider pool adds suggestions only. Nothing new can block.
 */

const INDEX = Array.from({ length: 12 }, (_, i) => ({
  name: `skill-${i}`,
  desc: `animation motion design ${"extra ".repeat(i % 3)}`,
}))

test("the candidate pool is wider than three", () => {
  const scored = scoreRouter("animation motion design", INDEX)
  expect(scored.length).toBeGreaterThan(3)
})

test("a wider pool adds SUGGESTED, never new REQUIRED", () => {
  const scored = scoreRouter("animation motion design", INDEX)
  const { required } = classify(scored)
  // Everything mandated must have earned it on score, not on rank.
  for (const name of required) {
    const row = scored.find((s: any) => s.name === name)
    expect(row!.score).toBeGreaterThanOrEqual(STRONG)
  }
})

test("results stay ordered by score, best first", () => {
  const scored = scoreRouter("animation motion design", INDEX)
  const scores = scored.map((s: any) => s.score)
  expect([...scores].sort((a, b) => b - a)).toEqual(scores)
})

test("the pool is still bounded — a huge index cannot flood the prompt", () => {
  const big = Array.from({ length: 500 }, (_, i) => ({ name: `s${i}`, desc: "animation" }))
  expect(scoreRouter("animation", big).length).toBeLessThanOrEqual(10)
})

// The case this exists for: a genuinely relevant skill that ranks below the top 3 must
// still be surfaced instead of silently discarded.
test("a relevant skill ranked below the top 3 is still surfaced", () => {
  const index = [
    { name: "radix-ui-design-system", desc: "ui design system components" },
    { name: "ui-ux-pro-max", desc: "ui ux design at scale" },
    { name: "angular-ui-patterns", desc: "ui patterns for angular" },
    { name: "emil-design-eng", desc: "philosophy on ui polish, component design, invisible details" },
  ]
  const scored = scoreRouter("componente de ui con buen pulido", index)
  expect(scored.map((s: any) => s.name)).toContain("emil-design-eng")
})
