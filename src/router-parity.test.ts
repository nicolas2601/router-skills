import { test, expect } from "bun:test"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { scoreSkills as gateLibScoreSkills, classify as gateLibClassify } from "../gate/claude/skill-gate-lib.mjs"
import { scoreGate, classify as coreClassify, loadIndex, defaultDeps } from "../gate/core/router-core.mjs"

/**
 * D2/AC-15 characterization test — written BEFORE touching skill-gate-lib.mjs (T037).
 * This MUST already pass against the pre-refactor, hand-written `skill-gate-lib.mjs`:
 * it proves `scoreGate` (T009, ported into router-core.mjs during batch 1) already
 * agrees bit-for-bit with the currently-shipped `scoreSkills`, BEFORE the T038 refactor
 * turns `skill-gate-lib.mjs` into a thin re-export of `router-core`. If this fails here,
 * the bug is in T009's port, not in this test — per the task instructions, STOP and fix
 * scoreGate rather than "fixing" this test to match.
 */

// Combined fixture corpus drawn from AC-1/AC-2/AC-5's worked examples.
const FIXTURE_ROWS: { name: string; desc: string }[] = [
  { name: "claude-code-guide", desc: "guide for claude code hooks and configuration" },
  { name: "notas-utility", desc: "crea notas y tambien recordatorios, también historial" },
  { name: "turbo-cache", desc: "cache cache cache invalidation layer" },
  { name: "report-gen", desc: "reports reports quickly compiled" },
]

const FIXTURE_PROMPTS = [
  "test claude code hooks", // AC-2 row 1 (ambient down-weight, filtered below SOFT_MIN)
  "necesito notas también", // AC-2 row 2 (accented también correctly a stopword)
  "notas notas notas también", // AC-2 dedup proof
  "please cache it correctly today", // AC-1 fixture, scored via gate weights (not router)
  "can we get reports done please", // AC-1 fixture, scored via gate weights
]

function withTempIndex(rows: { name: string; desc: string }[], fn: (indexPath: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "router-parity-"))
  const indexPath = join(dir, "skills-index.tsv")
  const tsv = rows.map((r) => `${r.name}\t${r.desc}`).join("\n") + "\n"
  writeFileSync(indexPath, tsv)
  try {
    fn(indexPath)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test("D2/AC-15: scoreGate (router-core) is bit-for-bit identical to scoreSkills (skill-gate-lib.mjs) on the AC-1/AC-2/AC-5 corpus", () => {
  withTempIndex(FIXTURE_ROWS, (indexPath) => {
    // W3: router-core's `loadIndex` requires `deps` explicitly (no default) — this test
    // legitimately reads real fs (a throwaway tmpdir fixture, not $HOME), so it injects
    // `defaultDeps()` EXPLICITLY here rather than relying on a silently-defaulted param
    // (the exact leak this test used to have, flagged in the QA report as W3).
    const coreIndex = loadIndex(indexPath, defaultDeps())
    for (const prompt of FIXTURE_PROMPTS) {
      const legacy = gateLibScoreSkills(prompt, { indexPath })
      const ported = scoreGate(prompt, coreIndex)
      expect(ported).toEqual(legacy)

      const legacyClassified = gateLibClassify(legacy)
      const portedClassified = coreClassify(ported)
      expect(portedClassified).toEqual(legacyClassified)
    }
  })
})
