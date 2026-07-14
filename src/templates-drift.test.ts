import { test, expect } from "bun:test"
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { PLUGIN_TS } from "./templates.ts"
import { computeTemplates } from "../scripts/gen-templates.mjs"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

/**
 * T040/AC-5/AC-13: PLUGIN_TS must be COMPOSED (de-exported router-core.mjs + the plugin
 * shell), not read verbatim from a hand-copied `skill-enforcer.ts`. The accented
 * "también" stopword is the concrete regression guard: the old hand-copied scorer's
 * STOPWORDS set was missing it (confirmed by direct read — see apply-progress.md),
 * which silently turned a `suggested`(4) result into `required`(5) via the LEADER
 * fallback on the opencode side only (AC-5's worked example). After composing PLUGIN_TS
 * from the SAME router-core.mjs both harnesses share, this string must be present.
 */
test("PLUGIN_TS uses the unified STOPWORDS, closing the accented-también drift bug (AC-5/AC-13)", () => {
  expect(PLUGIN_TS.includes("también")).toBe(true)
})

// T041/AC-13: structural guards on the composed PLUGIN_TS — proving the dedup is real,
// not just that "también" happens to be present.
test("PLUGIN_TS: exactly one STOPWORDS declaration, no duplicated scoring constants (AC-13)", () => {
  const stopwordsDecls = PLUGIN_TS.match(/\bconst STOPWORDS\s*=/g) || []
  expect(stopwordsDecls.length).toBe(1)
})

test("PLUGIN_TS: exactly one AMBIENT declaration, no duplicated scoring constants (AC-13)", () => {
  const ambientDecls = PLUGIN_TS.match(/\bconst AMBIENT\s*=/g) || []
  expect(ambientDecls.length).toBe(1)
})

test("PLUGIN_TS: self-contained — no `import` statement referencing router-core (D6/AC-13)", () => {
  expect(/\bimport\b[^;\n]*\brouter-core/.test(PLUGIN_TS)).toBe(false)
})

test("PLUGIN_TS: chat.message handler is actually wired to both scoreGate( and scoreRouter( (AC-13)", () => {
  expect(PLUGIN_TS).toContain("scoreGate(")
  expect(PLUGIN_TS).toContain("scoreRouter(")
})

test("PLUGIN_TS: transpiles cleanly as TypeScript (compensating control for the un-typechecked string constant)", () => {
  expect(() => new Bun.Transpiler({ loader: "ts" }).transformSync(PLUGIN_TS)).not.toThrow()
})

// W5: `Bun.Transpiler` above only validates SYNTAX — it happily accepts a reference to a
// free identifier that doesn't exist anywhere in scope (that's a runtime `ReferenceError`,
// not a syntax error). Proven concretely: renaming `scoreRouter` (or `skillsIndexPath`,
// or any other core export) in `gate/core/router-core.mjs` still passes `gen --check`,
// still transpiles, still passes all other tests — and the shipped opencode plugin dies
// at runtime with `ReferenceError: scoreRouter is not defined` inside its top-level
// `chat.message` handler. This test runs the REAL TypeScript compiler (`tsc --noEmit`)
// against the composed `PLUGIN_TS`, ambient-declaring `@opencode-ai/plugin` (not an
// installed dependency here), and asserts there are ZERO "cannot find name" diagnostics
// (TS2304 / TS2552) — the exact diagnostic class that fires for an undeclared/renamed
// free identifier. Other diagnostic classes (implicit-any, structural type mismatches on
// this de-exported, JSDoc-typed plain JS) are accepted noise, not what this control is
// for — narrowing to the reference-error class keeps the check robust to unrelated
// TS-inference quirks while still closing the actual gap Bun's transpiler leaves open.
test("PLUGIN_TS: tsc --noEmit finds no undeclared/renamed free identifiers (W5, compensating control)", () => {
  const dir = mkdtempSync(join(tmpdir(), "plugin-ts-typecheck-"))
  try {
    writeFileSync(join(dir, "plugin.ts"), PLUGIN_TS)
    // `@opencode-ai/plugin` is not an installed dependency in this repo — ambient-declare
    // just enough of its surface for the shell's `import type { Plugin }` to resolve.
    writeFileSync(join(dir, "ambient.d.ts"), 'declare module "@opencode-ai/plugin" {\n  export type Plugin = any\n}\n')
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "esnext",
            module: "esnext",
            moduleResolution: "bundler",
            moduleDetection: "force",
            skipLibCheck: true,
            noEmit: true,
            strict: false,
            noImplicitAny: false,
            typeRoots: [join(ROOT, "node_modules", "@types")],
            types: ["node"],
          },
          include: ["plugin.ts", "ambient.d.ts"],
        },
        null,
        2,
      ),
    )

    const tsc = join(ROOT, "node_modules", ".bin", "tsc")
    const result = spawnSync(tsc, [], { cwd: dir, encoding: "utf8", timeout: 60_000 })
    const output = `${result.stdout || ""}${result.stderr || ""}`
    const referenceErrors = output
      .split("\n")
      .filter((l) => /\bTS2304\b|\bTS2552\b/.test(l))

    expect(referenceErrors).toEqual([])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// T045: computeTemplates() must be importable (no child process) and its output must
// match the committed src/templates.ts exactly — the CI guard against the #1 pre-mortem
// failure: editing gate/ and forgetting `bun run gen`, shipping a stale scorer.
test("gen: computeTemplates() output matches the committed src/templates.ts (no drift)", () => {
  const computed = computeTemplates()
  const committed = readFileSync(join(ROOT, "src/templates.ts"), "utf8")
  expect(computed).toBe(committed)
})

// windows-latest CI regression: with no `.gitattributes`, a Windows runner checks the repo
// out with `core.autocrlf=true`, so the `gate/**` sources land with CRLF line endings.
// `computeTemplates()` JSON.stringify-embeds them verbatim, so the generated output
// byte-diverges from the LF `src/templates.ts` committed from a Linux/macOS checkout — a
// real drift the `gen --check` guard then (correctly) flags as stale, even though nothing
// under gate/ actually changed. This test reproduces that exact scenario WITHOUT depending
// on a real Windows checkout: it twins every embedded gate/ source into two scratch trees —
// one byte-identical (LF), one with every `\n` rewritten to `\r\n` (simulating the CRLF
// checkout) — and asserts `computeTemplates()` produces IDENTICAL output for both, proving
// the generator is byte-stable regardless of how the repo was checked out.
test("gen: a CRLF checkout of the gate/ sources produces byte-identical templates.ts output to its LF twin", () => {
  const lfRoot = mkdtempSync(join(tmpdir(), "skillforge-gen-lf-"))
  const crlfRoot = mkdtempSync(join(tmpdir(), "skillforge-gen-crlf-"))
  try {
    const gateFiles = [
      "gate/core/router-core.mjs",
      "gate/claude/skill-gate-lib.mjs",
      "gate/claude/skill-gate-eval.mjs",
      "gate/claude/skill-gate-track.mjs",
      "gate/claude/skill-gate-stop.mjs",
      "gate/claude/skill-router.mjs",
      "gate/claude/skill-usage-tracker.mjs",
      "gate/opencode/skill-enforcer.template.ts",
      "gate/opencode/skill-enforcement.md",
    ]
    for (const rel of gateFiles) {
      // Read the REAL committed source (LF, verified — see FAILURE 1 diagnosis) and twin
      // it into both scratch trees, so any embedded '\n' in the fixture (not just line
      // ends) is exercised too.
      const src = readFileSync(join(ROOT, rel), "utf8")
      const lfPath = join(lfRoot, rel)
      const crlfPath = join(crlfRoot, rel)
      mkdirSync(dirname(lfPath), { recursive: true })
      mkdirSync(dirname(crlfPath), { recursive: true })
      writeFileSync(lfPath, src)
      writeFileSync(crlfPath, src.replace(/\n/g, "\r\n"))
    }

    const lfOutput = computeTemplates(lfRoot)
    const crlfOutput = computeTemplates(crlfRoot)
    expect(crlfOutput).toBe(lfOutput)
  } finally {
    rmSync(lfRoot, { recursive: true, force: true })
    rmSync(crlfRoot, { recursive: true, force: true })
  }
})
