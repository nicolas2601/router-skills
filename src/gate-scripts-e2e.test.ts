import { test, expect } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

/**
 * Real end-to-end reproductions of W6-W9 (the Claude Code legacy gate scripts — not yet
 * deps-injected, real top-level-await entrypoints, only testable by spawning a real child
 * process against a scratch $HOME/scratch cwd).
 */

// W6: `skill-gate-eval.mjs`'s `try { indexInfo = ensureGateIndex() } catch { indexInfo =
// null }` DISABLES the very warning it exists to emit — `if (indexInfo && ...)` is skipped
// whenever the catch fires, so the gate degrades with NO [GATE WARNING] in exactly the case
// that matters most.
//
// Evidence this genuinely cannot be forced via any real filesystem condition (verified, not
// assumed): `ensureIndex`/`ensureGateIndex` is exhaustively fail-open by design — every
// fs call inside it (statSync, readdirSync, readFileSync, mkdirSync, writeFileSync/rename)
// is individually try/catch-guarded and degrades to `empty`/`indexError` instead of
// throwing. Manually verified against `~/.claude` being a plain FILE (not a directory) and
// against a self-referential symlink cycle under `~/.claude/agents` (which would trigger
// unbounded recursion in a naive walk) — neither throws; the symlink cycle is caught by the
// existing `statSync` ELOOP guard.
//
// Since a real throw cannot be manufactured externally, this test copies the REAL,
// UNMODIFIED `skill-gate-eval.mjs` source into an isolated scratch directory alongside a
// STUB `skill-gate-lib.mjs` (same relative filename, so the copied script's own
// `import ... from "./skill-gate-lib.mjs"` resolves to the stub, without touching the real
// module graph at all — zero risk of leaking a mock across other test files, unlike
// `bun:test`'s `mock.module`, which replaces module resolution PROCESS-WIDE and was
// confirmed by direct trial to leak into `router-parity.test.ts` when tried here). Spawned
// as a REAL, separate child process — the same isolation guarantee every other test in this
// file relies on.
test("skill-gate-eval: an ensureGateIndex() throw surfaces as [GATE WARNING], never silently nulled (W6)", () => {
  const scratch = mkdtempSync(join(tmpdir(), "skillforge-gate-w6-"))
  const gateDir = join(scratch, "gatefiles")
  mkdirSync(gateDir, { recursive: true })
  try {
    const realEvalSrc = readFileSync(join(ROOT, "gate/claude/skill-gate-eval.mjs"), "utf8")
    writeFileSync(join(scratch, "skill-gate-eval.mjs"), realEvalSrc)
    writeFileSync(
      join(scratch, "skill-gate-lib.mjs"),
      [
        "export function scoreSkills() { return [] }",
        "export function classify() { return { required: [], suggested: [] } }",
        "export function readSkillBody() { return '' }",
        `export function gatePaths() { return { required: ${JSON.stringify(join(gateDir, "s.required.json"))}, activated: ${JSON.stringify(join(gateDir, "s.activated"))}, blocks: ${JSON.stringify(join(gateDir, "s.blocks"))} } }`,
        "export function ensureGateIndex() { throw new Error('boom: simulated internal failure') }",
        "",
      ].join("\n"),
    )

    const result = spawnSync(process.execPath, [join(scratch, "skill-gate-eval.mjs")], {
      input: JSON.stringify({ prompt: "please review my react component", session_id: "w6-turn" }),
      env: { PATH: process.env.PATH },
      encoding: "utf8",
      timeout: 20_000,
    })

    expect(result.status).toBe(0) // must never crash the hook
    expect(result.stdout).toContain("[GATE WARNING]")
    expect(result.stdout).toContain("boom: simulated internal failure")
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
})

// W7: `skill-gate-eval.mjs` writes the deterministic contract (p.required/p.activated/
// p.blocks) via 3 UNGUARDED `writeFileSync` calls. If ANY throws, the process dies before
// the directive/warning text is ever printed — a hard crash with no [GATE WARNING], not a
// degraded-but-visible turn. Forced here via a REAL, legitimate fs condition: pre-creating
// the target path as a DIRECTORY so `writeFileSync` throws EISDIR.
test("skill-gate-eval: a contract-write failure (EISDIR) surfaces [GATE WARNING], never a silent crash (W7)", () => {
  const home = mkdtempSync(join(tmpdir(), "skillforge-gate-w7-"))
  try {
    const sessionId = "w7-turn"
    const gateDir = join(home, ".claude", ".skillgate")
    mkdirSync(gateDir, { recursive: true })
    // Pre-create the REQUIRED contract path as a directory -> writeFileSync(p.required, ...)
    // throws EISDIR.
    mkdirSync(join(gateDir, `${sessionId}.required.json`))

    const evalScript = join(ROOT, "gate/claude/skill-gate-eval.mjs")
    const result = spawnSync(process.execPath, [evalScript], {
      input: JSON.stringify({ prompt: "please review my react component", session_id: sessionId }),
      env: { HOME: home, PATH: process.env.PATH },
      encoding: "utf8",
      timeout: 20_000,
    })

    // Must never crash the hook (a non-zero exit here would surface as a broken
    // UserPromptSubmit hook to the harness) — it must degrade LOUDLY instead.
    expect(result.status).toBe(0)
    expect(result.stdout).toContain("[GATE WARNING]")
    expect(result.stdout).toContain("enforcement INACTIVE this turn")
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

// W8: `skill-gate-stop.mjs` — a wrong-shaped `required` field (`{"required":"foo"}`, a
// string, not an array) parses fine, so the old blind `try{JSON.parse}catch{allow()}` never
// fires, and `required.filter(...)` on a string throws an UNCAUGHT TypeError, killing the
// Stop hook (non-zero exit) instead of degrading to a diagnosed allow.
test("skill-gate-stop: a wrong-shaped required field is a diagnosed allow, never an uncaught crash (W8)", () => {
  const home = mkdtempSync(join(tmpdir(), "skillforge-gate-w8-"))
  try {
    const sessionId = "w8-turn"
    const gateDir = join(home, ".claude", ".skillgate")
    mkdirSync(gateDir, { recursive: true })
    writeFileSync(join(gateDir, `${sessionId}.required.json`), JSON.stringify({ required: "foo", ts: Date.now() }))

    const stopScript = join(ROOT, "gate/claude/skill-gate-stop.mjs")
    const result = spawnSync(process.execPath, [stopScript], {
      input: JSON.stringify({ session_id: sessionId }),
      env: { HOME: home, PATH: process.env.PATH },
      encoding: "utf8",
      timeout: 20_000,
    })

    expect(result.status).toBe(0) // must allow the turn to end, never crash uncaught
    expect(result.stderr).toContain("[GATE WARNING]")
    expect(result.stdout || "").toBe("") // allow() path -> no block JSON printed
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

// W9: `skill-gate-track.mjs` wraps BOTH the `JSON.parse` AND the `appendFileSync` in ONE
// blind catch — if the append fails, the model's real Skill() activation is never recorded,
// and the Stop gate later blocks the turn with a FALSE accusation ("you never activated X")
// even though the model complied. Forced via a real EISDIR (pre-create p.activated as a
// directory).
test("skill-gate-track: an append failure (EISDIR) surfaces a diagnostic, distinct from a parse failure (W9)", () => {
  const home = mkdtempSync(join(tmpdir(), "skillforge-gate-w9-"))
  try {
    const sessionId = "w9-turn"
    const gateDir = join(home, ".claude", ".skillgate")
    mkdirSync(gateDir, { recursive: true })
    mkdirSync(join(gateDir, `${sessionId}.activated`)) // forces EISDIR on appendFileSync

    const trackScript = join(ROOT, "gate/claude/skill-gate-track.mjs")
    const result = spawnSync(process.execPath, [trackScript], {
      input: JSON.stringify({ session_id: sessionId, tool_name: "Skill", tool_input: { skill: "code-review" } }),
      env: { HOME: home, PATH: process.env.PATH },
      encoding: "utf8",
      timeout: 20_000,
    })

    expect(result.status).toBe(0) // never crash — a PostToolUse hook must not break the turn
    expect(result.stderr).toContain("[GATE WARNING]")
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

// W9 (regression guard): a genuinely malformed stdin payload must stay silent — no write was
// ever attempted, so there is nothing to diagnose. Only a WRITE failure gets a diagnostic.
test("skill-gate-track: malformed stdin stays silent (no write was ever attempted, nothing to diagnose)", () => {
  const home = mkdtempSync(join(tmpdir(), "skillforge-gate-w9b-"))
  try {
    const trackScript = join(ROOT, "gate/claude/skill-gate-track.mjs")
    const result = spawnSync(process.execPath, [trackScript], {
      input: "{ not valid json",
      env: { HOME: home, PATH: process.env.PATH },
      encoding: "utf8",
      timeout: 20_000,
    })
    expect(result.status).toBe(0)
    expect(result.stderr || "").toBe("")
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
