import { test, expect } from "bun:test"
import { scoreRouter, classify, MAX_QUERY_TOKENS } from "../gate/core/router-core.mjs"

/**
 * The router runs on EVERY prompt, in two hooks, inside a 60s harness timeout. Three things
 * made that a liability:
 *
 * 1. A RegExp was compiled per (token, row) pair. With 1307 skills and a pasted file, that
 *    is millions of compiles. Measured: 4.6 SECONDS for a 10KB paste; ~86s at 86KB, past the
 *    hook timeout. The whole-word fix introduced this cost — the bash it replaced used awk's
 *    index(), which is cheap C.
 * 2. Query tokens were never deduped, so a repeated word paid full price every time.
 * 3. Scores sum per occurrence with no normalization, so a long paste does not just cost
 *    time — it WINS. Pasting a Node stack trace scored powershell-module-architect at 150
 *    and mandated it.
 *
 * The root insight for all three: a pasted file is not a query. Intent lives in the words
 * the user actually wrote, not in the 10KB they dumped. Bounding the query fixes the
 * blow-up and the score flooding at once.
 */

const INDEX = Array.from({ length: 1200 }, (_, i) => ({
  name: `skill-${i}`,
  desc: `handler config service module number ${i} animation motion design`,
}))

test("a huge pasted prompt stays fast — well inside the hook timeout", () => {
  let pasted = "revisar las animaciones del modal "
  for (let i = 0; i < 1200; i++) pasted += `token${i} handler${i % 37} config${i % 53} `

  const t0 = performance.now()
  scoreRouter(pasted, INDEX)
  const ms = performance.now() - t0

  // Was ~4600ms on a 1307-row index before. The bar is deliberately generous: the point is
  // that it is bounded, not that it hits a specific number on a specific machine.
  expect(ms).toBeLessThan(500)
})

test("the query is bounded — a pasted file cannot flood the scorer", () => {
  expect(MAX_QUERY_TOKENS).toBeGreaterThan(10)
  expect(MAX_QUERY_TOKENS).toBeLessThanOrEqual(64)
})

test("bounding the query does not change results for a normal prompt", () => {
  const index = [
    { name: "motion", desc: "animation and motion design" },
    { name: "database-optimizer", desc: "optimize slow database queries" },
  ]
  expect(scoreRouter("revisar las animaciones del modal", index)[0].name).toBe("motion")
  expect(scoreRouter("optimizar la consulta a la base de datos", index)[0].name).toBe("database-optimizer")
})

/**
 * P2 from the audit: a pasted stack trace scored powershell-module-architect at 150 and
 * MANDATED it. Deduping alone is not enough — the blob's words are genuinely in the prompt,
 * and lexically they really do match. No scorer can guess they are junk.
 *
 * The signal that separates them is positional: people state the ask, then paste the file
 * below it. So content past the opening lines can SUGGEST, but it can never MANDATE. You do
 * not get blocked on a skill because of something in a log you pasted.
 */
const INDEX_BLOB = [
  { name: "motion", desc: "animation and motion design for the web" },
  { name: "powershell-module-architect", desc: "powershell module handler config service function error" },
]

const PASTED = [
  "revisar las animaciones del modal",
  ...Array.from({ length: 80 }, () => "function handler config service error"),
].join("\n")

test("a pasted blob cannot MANDATE a skill — only the opening ask can", () => {
  const { required } = classify(scoreRouter(PASTED, INDEX_BLOB))
  expect(required).not.toContain("powershell-module-architect")
})

test("the blob can still be suggested — it is context, just not a mandate", () => {
  const scored = scoreRouter(PASTED, INDEX_BLOB)
  expect(scored.map((s: any) => s.name)).toContain("powershell-module-architect")
})

test("repeated tokens are deduped — the same word does not pay twice", () => {
  const index = [{ name: "motion", desc: "animation motion design" }]
  const once = scoreRouter("animation", index)[0].score
  const many = scoreRouter("animation animation animation animation", index)[0].score
  expect(many).toBe(once)
})
