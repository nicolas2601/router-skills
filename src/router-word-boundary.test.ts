import { test, expect } from "bun:test"
import { scoreRouter, classify } from "../gate/core/router-core.mjs"

/**
 * The bash original matched query tokens against skill descriptions with grep-style
 * SUBSTRING containment. That is fine for long English tokens and catastrophic for
 * short ones: the Spanish word "mal" ("bad") is a substring of "deci-MAL-",
 * "nor-MAL-", "for-MAL-", "ani-MAL-". Real prompts in Spanish routinely contain it.
 *
 * The damage was not a bad suggestion — it was a bad ENFORCEMENT. Junk skills cleared
 * the HARD threshold and were injected as [OBLIGATORIO], burning context on skills
 * that have nothing to do with the task.
 *
 * Matching must be on whole words.
 */
const INDEX = [
  { name: "motion", desc: "animation and motion design for the web" },
  { name: "evm-token-decimals", desc: "prevent silent decimal mismatch bugs across evm chains" },
  { name: "azure-anomaly-detector", desc: "univariate anomaly detection and normal behavior baselines" },
  { name: "formal-verification", desc: "formal methods and proofs" },
]

test('the Spanish token "mal" must not match "decimal" / "normal" / "formal"', () => {
  const scored = scoreRouter("el motion se siente mal", INDEX)
  const names = scored.map((s: any) => s.name)

  expect(names).toContain("motion")
  expect(names).not.toContain("evm-token-decimals")
  expect(names).not.toContain("azure-anomaly-detector")
  expect(names).not.toContain("formal-verification")
})

test("substring false positives never reach HARD enforcement", () => {
  const scored = scoreRouter("revisar las animaciones del modal, el motion se siente mal", INDEX)
  const { required } = classify(scored)

  expect(required).not.toContain("evm-token-decimals")
  expect(required).not.toContain("azure-anomaly-detector")
})

test("whole-word matches still score — the fix must not deafen the router", () => {
  const scored = scoreRouter("necesito animation y motion", INDEX)
  expect(scored[0].name).toBe("motion")
  expect(scored[0].score).toBeGreaterThan(0)
})

// Hyphenated skill names are normalized to spaces, so a query word must still hit them.
test("a query word matches a hyphenated skill name as a whole word", () => {
  const scored = scoreRouter("anomaly detection", INDEX)
  expect(scored.map((s: any) => s.name)).toContain("azure-anomaly-detector")
})

// Repetition still counts (the original capped occurrences at 3) — but per word.
test("repeated whole-word occurrences still accumulate", () => {
  const idx = [{ name: "x", desc: "motion motion motion motion" }]
  const scored = scoreRouter("motion", idx)
  expect(scored[0].score).toBeGreaterThanOrEqual(3)
})
