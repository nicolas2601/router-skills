import { test, expect } from "bun:test"
import nodePath from "node:path"
import { main as routerMain } from "../gate/claude/skill-router.mjs"
import { main as trackerMain } from "../gate/claude/skill-usage-tracker.mjs"
import { skillsIndexPath, agentsIndexPath, lastSuggestionPath, memoryDir } from "../gate/core/router-core.mjs"

const posix = nodePath.posix

type Stat = { isDirectory: () => boolean; isFile: () => boolean; mtimeMs: number; size: number }
type FsStub = {
  existsSync: (p: string) => boolean
  readFileSync: (p: string, enc?: string) => string
  writeFileSync: (p: string, data: string) => void
  appendFileSync: (p: string, data: string) => void
  mkdirSync: (p: string, o?: { recursive?: boolean }) => void
  readdirSync: (p: string) => string[]
  statSync: (p: string) => Stat
  rmSync: (p: string, o?: { force?: boolean }) => void
  renameSync: (from: string, to: string) => void
}
type SpawnResult = { stdout: string; status: number }
type SpawnFn = (cmd: string, args: string[], o: object) => SpawnResult
type CoreDeps = {
  fs: FsStub
  env: Record<string, string | undefined>
  home: string
  cwd: string
  spawn: SpawnFn
  now: () => number
  path: typeof posix
  warn: (msg: string) => void
}

/** Hermetic in-memory fs stub with a call-log, mirroring router-index.test.ts's pattern. */
function makeFakeFs() {
  const files = new Map<string, string>()
  const dirs = new Map<string, string[]>()
  const stats = new Map<string, Stat>()
  const calls: { op: string; path: string }[] = []

  const fs: FsStub = {
    existsSync: (p) => {
      calls.push({ op: "existsSync", path: p })
      return files.has(p) || dirs.has(p)
    },
    readFileSync: (p) => {
      calls.push({ op: "readFileSync", path: p })
      if (!files.has(p)) throw new Error(`ENOENT: ${p}`)
      return files.get(p) as string
    },
    writeFileSync: (p, data) => {
      calls.push({ op: "writeFileSync", path: p })
      files.set(p, data)
      stats.set(p, { isDirectory: () => false, isFile: () => true, mtimeMs: 0, size: data.length })
    },
    appendFileSync: (p, data) => {
      calls.push({ op: "appendFileSync", path: p })
      files.set(p, (files.get(p) || "") + data)
    },
    mkdirSync: (p) => {
      calls.push({ op: "mkdirSync", path: p })
      dirs.set(p, dirs.get(p) || [])
    },
    readdirSync: (p) => {
      calls.push({ op: "readdirSync", path: p })
      if (!dirs.has(p)) throw new Error(`ENOENT: ${p}`)
      return dirs.get(p) as string[]
    },
    statSync: (p) => {
      calls.push({ op: "statSync", path: p })
      const s = stats.get(p)
      if (!s) throw new Error(`ENOENT: ${p}`)
      return s
    },
    rmSync: (p) => {
      calls.push({ op: "rmSync", path: p })
      files.delete(p)
      dirs.delete(p)
    },
    renameSync: (from, to) => {
      calls.push({ op: "renameSync", path: `${from} -> ${to}` })
      if (!files.has(from)) throw new Error(`ENOENT: ${from}`)
      files.set(to, files.get(from) as string)
      files.delete(from)
      stats.set(to, { isDirectory: () => false, isFile: () => true, mtimeMs: 0, size: (files.get(to) || "").length })
      stats.delete(from)
    },
  }
  return { fs, files, dirs, stats, calls }
}

function baseDeps(fs: FsStub, overrides: Partial<CoreDeps> = {}): CoreDeps {
  return {
    fs,
    env: {},
    home: "/home/u",
    cwd: "/home/u",
    spawn: () => ({ stdout: "", status: 0 }),
    now: () => 0,
    path: posix,
    warn: () => {},
    ...overrides,
  }
}

/** Spy sink for `deps.warn` — records every message so a test can assert on it. */
function makeWarnSpy() {
  const messages: string[] = []
  return { warn: (msg: string) => messages.push(msg), messages }
}

// T028/AC-3: prompt < 10 chars is a no-op — index/scoring untouched entirely.
test("skill-router main: prompt <10 chars is a no-op, index untouched (AC-3)", () => {
  const { fs, calls } = makeFakeFs()
  const deps = baseDeps(fs)
  const out = routerMain(JSON.stringify({ prompt: "short" }), deps)
  expect(out).toBe("")
  expect(calls.length).toBe(0)
})

// T029/AC-3: prompt >= 10 chars, but zero tokens survive filtering AND no tech detected
// -> still a no-op (the bash `[[ ${#FILTERED[@]} -eq 0 ]] && [[ -z "$DETECTED_TECH" ]]`
// short-circuit). "the please and" tokenizes to nothing (all stopwords/short) and no
// TECH_KEYWORDS entry matches.
test("skill-router main: zero filtered tokens + no tech is a no-op (AC-3)", () => {
  const { fs, calls } = makeFakeFs()
  const deps = baseDeps(fs)
  const out = routerMain(JSON.stringify({ prompt: "the please and it can" }), deps)
  expect(out).toBe("")
  expect(calls.length).toBe(0)
})

// T030/AC-14: accepts {prompt}, {user_prompt}, and raw non-JSON text (same fallback
// as skill-gate-eval.mjs). Also the output-shape invariant: emitted text never begins
// with "{" (never a JSON control envelope a harness could opportunistically parse) —
// and, more strongly, is never itself valid JSON at all (the actual intent behind the
// invariant, per design.md's own stated rationale).
test("skill-router main: accepts prompt/user_prompt/raw text, output never starts with { (AC-14)", () => {
  const promptText = "please review my react component thoroughly"
  const shapes = [
    JSON.stringify({ prompt: promptText }),
    JSON.stringify({ user_prompt: promptText }),
    promptText, // raw, non-JSON
  ]
  for (const stdin of shapes) {
    const { fs } = makeFakeFs()
    const out = routerMain(stdin, baseDeps(fs))
    expect(out.length).toBeGreaterThan(0)
    expect(out.startsWith("{")).toBe(false)
    expect(() => JSON.parse(out)).toThrow()
  }
})

// T031/AC-3: HARD/SOFT/BUSCAR-SKILL assembly, using the AC-1 fixtures directly as the
// index+prompt input (a pre-built single-row index is injected via the fs stub at the
// exact path ensureIndex()/loadIndex() read from — no rebuild needed).
test("skill-router main: HARD/SOFT thresholds, HINT collapses into BUSCAR-SKILL (AC-3)", () => {
  // Row 1: MAX_SKILL_SCORE=6 (AC-1 turbo-cache fixture) -> HARD -> [OBLIGATORIO].
  {
    const { fs, files } = makeFakeFs()
    const deps = baseDeps(fs)
    files.set(skillsIndexPath(deps), "turbo-cache\tcache cache cache invalidation layer\n")
    const out = routerMain(JSON.stringify({ prompt: "please cache it correctly today" }), deps)
    expect(out.startsWith("[OBLIGATORIO]")).toBe(true)
    expect(out).toContain("turbo-cache")
    expect(out).toContain("6")
  }

  // Row 2: MAX_SKILL_SCORE=3 (AC-1 turbo-parser fixture) -> SOFT -> [SUGERIDO], turbo-parser(3).
  {
    const { fs, files } = makeFakeFs()
    const deps = baseDeps(fs)
    files.set(skillsIndexPath(deps), "turbo-parser\thandles data files efficiently\n")
    const out = routerMain(JSON.stringify({ prompt: "please turbo it now" }), deps)
    expect(out.startsWith("[SUGERIDO]")).toBe(true)
    expect(out).toContain("turbo-parser(3)")
  }

  // Row 3: MAX_SKILL_SCORE=2 (AC-1 report-gen fixture), no tech -> internal HINT collapses
  // into the [BUSCAR-SKILL] fallback (preserved bash quirk: no distinct [HINT] branch).
  {
    const { fs, files } = makeFakeFs()
    const deps = baseDeps(fs)
    files.set(skillsIndexPath(deps), "report-gen\treports reports quickly compiled\n")
    const out = routerMain(JSON.stringify({ prompt: "can we get reports done please" }), deps)
    expect(out.startsWith("[BUSCAR-SKILL] Sin match fuerte")).toBe(true)
    expect(out).not.toContain("[HINT]")
    expect(out).not.toContain("[OBLIGATORIO]")
    expect(out).not.toContain("[SUGERIDO]")
  }
})

// Batch-3 investigation (ALARM): manual smoke of "please review my react component for
// accessibility issues" printed a bare "[AGENTS] flutter-reviewer(6)" for a score of 6 —
// the HARD threshold. Root-cause evidence (verified, not assumed): that specific case is
// the D3 suppression branch working AS DESIGNED (gate.required was non-empty — the prompt
// also matched "react-components"/"vercel-react-best-practices" strongly enough for
// scoreGate+classify to require them; see T033's suppression contract). NOT a bug.
//
// But the investigation surfaced a REAL, independent bug in the process: `maxScore` (the
// HARD/SOFT threshold input) was computed from `topSkill.score` ONLY, ignoring
// `topAgent.score` entirely — a genuine divergence from `skill-router.sh:225` /
// `:227` (`[[ "$MAX_SKILL_SCORE" -ge 6 ]] || [[ "$MAX_AGENT_SCORE" -ge 6 ]]`, same OR for
// SOFT at `:227`). Effect: whenever gate.required is EMPTY (no D3 suppression) and an
// AGENT alone crosses the HARD/SOFT threshold with a weak-or-absent skill match, the level
// silently stayed "NONE" and the agent's strong match collapsed into the [BUSCAR-SKILL]
// fallback instead of [OBLIGATORIO]/[SUGERIDO] — exactly the kind of silent-downgrade bug
// this whole change exists to close. Pinned below with two rows, fixed under TDD.
test("skill-router main: agent-only score also drives the HARD/SOFT threshold (bash skill-router.sh:225/227 OR semantics)", () => {
  // Row 1: skill index has one irrelevant row (score 0, excluded from topSkill by
  // scoreRouter's `score > 0` filter — verified: scoreRouter returns [] for it against
  // this prompt) so gate.required stays empty (no D3 suppression) — agent alone scores 6
  // (AC-1 turbo-cache fixture, reused as an agent row) -> LEVEL must be HARD via the
  // agent score alone; bash's HARD branch (skill-router.sh:311-316) is winner-take-all —
  // no skill beats/ties the agent's 6, so bash picks the agent's "[OBLIGATORIO]" line.
  {
    const { fs, files } = makeFakeFs()
    const deps = baseDeps(fs)
    files.set(skillsIndexPath(deps), "unrelated-skill\tsomething totally different topic\n")
    files.set(agentsIndexPath(deps), "turbo-cache\tcache cache cache invalidation layer\n")
    const out = routerMain(JSON.stringify({ prompt: "please cache it correctly today" }), deps)
    expect(out.startsWith("[OBLIGATORIO]")).toBe(true)
    expect(out).toContain("turbo-cache")
    expect(out).toContain("6")
    expect(out).not.toContain("[BUSCAR-SKILL]")
  }

  // Row 2: same shape, agent scores 3 (AC-1 turbo-parser fixture) -> SOFT threshold via
  // the agent alone. Bash's SOFT branch (skill-router.sh:317-326) is NOT winner-take-all —
  // it shows whichever of SKILLS/AGENTS is non-empty — but critically: when TOP_SKILLS is
  // EMPTY, the "[AGENTS] …" segment is emitted BARE, with NO "[SUGERIDO]" prefix at all
  // (CTX starts empty, so the `[[ -n "$CTX" ]] && CTX+=" || "` guard never fires and the
  // literal `$PREFIX` text is never prepended). This is a genuine, deliberate bash quirk —
  // pinned here, not "fixed" into having a prefix.
  {
    const { fs, files } = makeFakeFs()
    const deps = baseDeps(fs)
    files.set(skillsIndexPath(deps), "unrelated-skill\tsomething totally different topic\n")
    files.set(agentsIndexPath(deps), "turbo-parser\thandles data files efficiently\n")
    const out = routerMain(JSON.stringify({ prompt: "please turbo it now" }), deps)
    expect(out.startsWith("[SUGERIDO]")).toBe(false)
    expect(out).toContain("[AGENTS]")
    expect(out).toContain("turbo-parser(3)")
    expect(out).not.toContain("[BUSCAR-SKILL]")
  }
})

// T032/AC-6/AC-14: an empty index (skills dir absent, zero rows on disk) is the ONE
// spec'd exception to fail-open — it must be LOUD, never silent, per the explicit bug
// this whole change exists to fix. Also: no throw, main still returns cleanly.
test("skill-router main: empty index emits [ROUTER WARNING], never silent (AC-6/AC-14)", () => {
  const { fs } = makeFakeFs() // no skillsDir, no pre-built index file at all
  const deps = baseDeps(fs)
  let out = ""
  expect(() => {
    out = routerMain(JSON.stringify({ prompt: "please review my react component" }), deps)
  }).not.toThrow()
  expect(out.split("\n").some((l) => l.startsWith("[ROUTER WARNING]"))).toBe(true)
})

// K3: a writeFileSync failure building the index (EACCES/EROFS/ENOSPC) must surface as a
// LOUD `[ROUTER WARNING]`, exactly like the empty-index case above — silently degrading to
// an empty suggestion (the original sin this whole change exists to eradicate) is not
// acceptable just because the failure happened one step earlier, at write time instead of
// read time.
test("skill-router main: index writeFileSync failure emits [ROUTER WARNING], never silent (K3)", () => {
  const { fs, dirs, stats, files } = makeFakeFs()
  const skillsDir = "/home/u/.claude/skills"
  const skillPath = `${skillsDir}/turbo-cache`
  const mdPath = `${skillPath}/SKILL.md`
  dirs.set(skillsDir, ["turbo-cache"])
  stats.set(skillsDir, { isDirectory: () => true, isFile: () => false, mtimeMs: 1, size: 0 })
  stats.set(skillPath, { isDirectory: () => true, isFile: () => false, mtimeMs: 100, size: 0 })
  stats.set(mdPath, { isDirectory: () => false, isFile: () => true, mtimeMs: 200, size: 40 })
  files.set(mdPath, '---\ndescription: "Turbo caching skill"\n---\n')

  const realWrite = fs.writeFileSync
  fs.writeFileSync = () => {
    throw new Error("EACCES: permission denied, open")
  }
  const deps = baseDeps(fs)

  let out = ""
  expect(() => {
    out = routerMain(JSON.stringify({ prompt: "please cache it correctly today" }), deps)
  }).not.toThrow()
  expect(out.split("\n").some((l) => l.startsWith("[ROUTER WARNING]"))).toBe(true)
  expect(out).toContain("EACCES")
  fs.writeFileSync = realWrite
})

// K3: main()'s catch must never fall back to a bare "" — fail-open is not fail-silent.
// Forced by an unguarded dependency throw (a broken `path.join`) that no internal
// try/catch wraps, to prove the OUTER catch itself now emits a warning instead of
// swallowing the failure into indistinguishable silence.
test("skill-router main: an unexpected internal throw still emits a warning, never a bare empty string (K3)", () => {
  const { fs } = makeFakeFs()
  const brokenPath = {
    ...posix,
    join: () => {
      throw new Error("boom: path.join exploded")
    },
  }
  const deps = baseDeps(fs, { path: brokenPath as unknown as typeof posix })

  let out = ""
  expect(() => {
    out = routerMain(JSON.stringify({ prompt: "please review my react component" }), deps)
  }).not.toThrow()
  expect(out).not.toBe("")
  expect(out).toContain("[ROUTER WARNING]")
})

// K6: bash's `rescore()` (skill-router.sh:207-208) adjusts BOTH TOP_SKILLS and
// TOP_AGENTS via the same `adjust()` ignore-bump. The port only ever `.map(adjust)`ed
// `scoredSkills`, leaving `scoredAgents` untouched — the documented "3+ ignores ->
// escalate" feedback loop was dead for agents even though `skill-usage-tracker.mjs`
// keeps writing `kind=agent` lines into `ignored-skills.md` for exactly this purpose.
test("skill-router main: adjust() ignore-bump also applies to AGENTS, not just skills (K6)", () => {
  const { fs, files, dirs } = makeFakeFs()
  const deps = baseDeps(fs)
  files.set(skillsIndexPath(deps), "unrelated-skill\tsomething totally different topic\n")
  files.set(agentsIndexPath(deps), "turbo-parser\thandles data files efficiently\n")

  const memDir = "/home/u/.claude/projects/-home-u/memory"
  dirs.set(memDir, [])
  files.set(
    `${memDir}/ignored-skills.md`,
    "turbo-parser | t1 | 3 | agent | x\nturbo-parser | t2 | 3 | agent | x\nturbo-parser | t3 | 3 | agent | x\n",
  )

  const out = routerMain(JSON.stringify({ prompt: "please turbo it now" }), deps)
  // Base agent score is 3 (AC-1 turbo-parser fixture); 3+ ignores must bump it +2 = 5,
  // exactly like the skill-side `adjust()` already did.
  expect(out).toContain("turbo-parser(5)")
  expect(out).not.toContain("turbo-parser(3)")
})

// W1: DELIBERATE port-vs-bash deviation, pinned by test (per the QA report's "either
// way" instruction). Bash (skill-router.sh:281-310) checks DETECTED_TECH FIRST and lets
// it override HARD/SOFT unconditionally. This port instead treats a strong LOCAL match
// (HARD/SOFT) as higher-confidence than a keyword-substring tech guess, and only surfaces
// the tech hint in the fallback (HINT/none) branch — see router-core.mjs's header comment
// for the documented rationale. This test locks that deliberate choice in place so a
// future change to the branch order is a conscious decision, not silent drift.
test("skill-router main: a HARD local match wins over a detected-tech hint (W1, documented deviation from bash)", () => {
  const { fs, files } = makeFakeFs()
  const deps = baseDeps(fs)
  // "react" is a TECH_KEYWORDS entry AND the fixture desc scores HARD (6) against it.
  files.set(skillsIndexPath(deps), "turbo-cache\tcache cache cache invalidation layer\n")
  const out = routerMain(JSON.stringify({ prompt: "please cache it correctly today with react" }), deps)
  expect(out.startsWith("[OBLIGATORIO]")).toBe(true)
  expect(out).not.toContain("Tech detectada")
})

// T033/D3: skill-router MUST NOT read any file skill-gate-eval writes (race-proof by
// design) — it re-derives the gate's `required` set itself via the same scoreGate+
// classify given the same prompt+index. Table-driven over the 3 design.md rows.
test("skill-router main: never contradicts gate's re-derived required set (D3)", () => {
  // Row 1: gate `required` NON-EMPTY (verified: scoreGate("cache manager please",
  // [cache-manager]) = 8 -> classify -> required=["cache-manager"]; scoreRouter = 12,
  // router level HARD too) -> suppress [BUSCAR-SKILL] AND the tech override, never
  // re-state the already-required skill; agent-less here -> emits nothing at all.
  {
    const { fs, files } = makeFakeFs()
    const deps = baseDeps(fs)
    files.set(skillsIndexPath(deps), "cache-manager\thandles cache manager operations\n")
    const out = routerMain(JSON.stringify({ prompt: "cache manager please" }), deps)
    expect(out).not.toContain("[OBLIGATORIO]")
    expect(out).not.toContain("[BUSCAR-SKILL]")
    expect(out).not.toContain("cache-manager")
    expect(out).toBe("")
  }

  // Row 1b: same gate-required-non-empty case, but WITH an agent match -> only the
  // complementary [AGENTS] line survives, still never restating the required skill.
  {
    const { fs, files } = makeFakeFs()
    const deps = baseDeps(fs)
    files.set(skillsIndexPath(deps), "cache-manager\thandles cache manager operations\n")
    files.set(agentsIndexPath(deps), "backend-architect\tcache manager systems design\n")
    const out = routerMain(JSON.stringify({ prompt: "cache manager please" }), deps)
    expect(out).not.toContain("[OBLIGATORIO]")
    expect(out).not.toContain("[BUSCAR-SKILL]")
    expect(out).not.toContain("cache-manager")
    expect(out).toContain("[AGENTS]")
    expect(out).toContain("backend-architect")
  }

  // Row 2: gate `required` EMPTY, router level HARD (AC-1 turbo-cache fixture, gate
  // score for it is only 4 -> never required) -> the routing block is emitted as-is,
  // exactly like T031's HARD case (gate said nothing to contradict).
  {
    const { fs, files } = makeFakeFs()
    const deps = baseDeps(fs)
    files.set(skillsIndexPath(deps), "turbo-cache\tcache cache cache invalidation layer\n")
    const out = routerMain(JSON.stringify({ prompt: "please cache it correctly today" }), deps)
    expect(out.startsWith("[OBLIGATORIO]")).toBe(true)
  }

  // Row 3: gate `required` EMPTY, router level HINT/no-match (AC-1 report-gen fixture)
  // -> [BUSCAR-SKILL] is the ONLY branch where that fallback is allowed.
  {
    const { fs, files } = makeFakeFs()
    const deps = baseDeps(fs)
    files.set(skillsIndexPath(deps), "report-gen\treports reports quickly compiled\n")
    const out = routerMain(JSON.stringify({ prompt: "can we get reports done please" }), deps)
    expect(out.startsWith("[BUSCAR-SKILL]")).toBe(true)
  }
})

// T034/AC-10 (writer half): writes last-suggestion.json with the exact shape the
// tracker consumes, using deps.now() for `ts` (never Date.now()), prompt truncated to
// 200 chars, whenever a top skill or top agent exists.
test("skill-router main: writes last-suggestion.json with the tracker-consumed shape", () => {
  const { fs, files } = makeFakeFs()
  const frozenMs = new Date("2026-01-01T00:00:00.000Z").getTime()
  const deps = baseDeps(fs, { now: () => frozenMs })
  files.set(skillsIndexPath(deps), "turbo-cache\tcache cache cache invalidation layer\n")
  const longPrompt = "please cache it correctly today " + "x".repeat(250)

  routerMain(JSON.stringify({ prompt: longPrompt }), deps)

  const written = files.get(lastSuggestionPath(deps))
  expect(written).toBeTruthy()
  const parsed = JSON.parse(written as string)
  expect(parsed).toEqual({
    ts: frozenMs,
    skill: "turbo-cache",
    agent: "",
    skill_score: 6,
    agent_score: 0,
    level: "HARD",
    prompt: longPrompt.slice(0, 200),
    tech: "",
  })
})

// ---------------------------------------------------------------------------
// T035/T036: skill-usage-tracker.mjs main(stdinString, deps)
// ---------------------------------------------------------------------------

function writeSuggestion(deps: CoreDeps, files: Map<string, string>, suggestion: object) {
  files.set(lastSuggestionPath(deps), JSON.stringify(suggestion))
}

// T035/AC-10: Skill tool_name matching the suggested skill -> recordUse + clear.
test("skill-usage-tracker main: Skill/Task/Agent tool_name credits use and clears suggestion (AC-10)", () => {
  // Skill match.
  {
    const { fs, files } = makeFakeFs()
    const deps = baseDeps(fs)
    writeSuggestion(deps, files, { skill: "code-review", agent: "", skill_score: 6, agent_score: 0, ts: 0 })
    trackerMain(JSON.stringify({ tool_name: "Skill", tool_input: { skill: "code-review" } }), deps)

    const statsPath = `${memoryDir(deps.home, deps.cwd, deps)}/claude-tool-stats.json`
    const stats = JSON.parse(files.get(statsPath) as string)
    expect(stats["code-review"].used).toBe(1)
    expect(files.has(lastSuggestionPath(deps))).toBe(false)
  }

  // Task tool_name matching the suggested agent.
  {
    const { fs, files } = makeFakeFs()
    const deps = baseDeps(fs)
    writeSuggestion(deps, files, {
      skill: "",
      agent: "backend-architect",
      skill_score: 0,
      agent_score: 7,
      ts: 0,
    })
    trackerMain(JSON.stringify({ tool_name: "Task", tool_input: { subagent_type: "backend-architect" } }), deps)

    const statsPath = `${memoryDir(deps.home, deps.cwd, deps)}/claude-tool-stats.json`
    const stats = JSON.parse(files.get(statsPath) as string)
    expect(stats["backend-architect"].used).toBe(1)
    expect(files.has(lastSuggestionPath(deps))).toBe(false)
  }

  // Agent tool_name (same semantics as Task) matching the suggested agent.
  {
    const { fs, files } = makeFakeFs()
    const deps = baseDeps(fs)
    writeSuggestion(deps, files, {
      skill: "",
      agent: "backend-architect",
      skill_score: 0,
      agent_score: 7,
      ts: 0,
    })
    trackerMain(JSON.stringify({ tool_name: "Agent", tool_input: { subagent_type: "backend-architect" } }), deps)

    const statsPath = `${memoryDir(deps.home, deps.cwd, deps)}/claude-tool-stats.json`
    const stats = JSON.parse(files.get(statsPath) as string)
    expect(stats["backend-architect"].used).toBe(1)
    expect(files.has(lastSuggestionPath(deps))).toBe(false)
  }

  // No last-suggestion.json on disk at all -> exits immediately, writes nothing.
  {
    const { fs, files } = makeFakeFs()
    const deps = baseDeps(fs)
    trackerMain(JSON.stringify({ tool_name: "Bash", tool_input: {} }), deps)
    expect(files.size).toBe(0)
  }
})

// T036/AC-10/AC-14: 30s+score>=3 ignore rule (skill/agent independent), invalid-JSON
// fail-open, main always exits clean (never throws).
test("skill-usage-tracker main: 30s+score>=3 ignore rule, invalid JSON fail-open, always exits clean (AC-10/AC-14)", () => {
  // 45s elapsed + score>=3 -> recordIgnore fires, ignored-skills.md line appended,
  // tool-stats.ignored++, suggestion cleared.
  {
    const { fs, files } = makeFakeFs()
    const deps = baseDeps(fs, { now: () => 45_000 })
    writeSuggestion(deps, files, {
      skill: "code-review",
      agent: "",
      skill_score: 5,
      agent_score: 0,
      ts: 0,
      prompt: "some prompt text",
    })
    trackerMain(JSON.stringify({ tool_name: "Bash", tool_input: {} }), deps)

    const memDir = memoryDir(deps.home, deps.cwd, deps)
    const ignoredContent = files.get(`${memDir}/ignored-skills.md`) || ""
    expect(ignoredContent).toContain("code-review |")
    const stats = JSON.parse(files.get(`${memDir}/claude-tool-stats.json`) as string)
    expect(stats["code-review"].ignored).toBe(1)
    expect(files.has(lastSuggestionPath(deps))).toBe(false)
  }

  // 20s elapsed (< 30s threshold) -> nothing recorded, suggestion left in place.
  {
    const { fs, files } = makeFakeFs()
    const deps = baseDeps(fs, { now: () => 20_000 })
    writeSuggestion(deps, files, {
      skill: "code-review",
      agent: "",
      skill_score: 5,
      agent_score: 0,
      ts: 0,
      prompt: "some prompt text",
    })
    trackerMain(JSON.stringify({ tool_name: "Bash", tool_input: {} }), deps)

    const memDir = memoryDir(deps.home, deps.cwd, deps)
    expect(files.has(`${memDir}/ignored-skills.md`)).toBe(false)
    expect(files.has(`${memDir}/claude-tool-stats.json`)).toBe(false)
    expect(files.has(lastSuggestionPath(deps))).toBe(true)
  }

  // 45s elapsed, skill_score below SOFT_MIN but agent_score above it -> the >=3 gate
  // applies independently: only the agent side is recorded, the skill side is not.
  {
    const { fs, files } = makeFakeFs()
    const deps = baseDeps(fs, { now: () => 45_000 })
    writeSuggestion(deps, files, {
      skill: "low-score-skill",
      agent: "strong-agent",
      skill_score: 2,
      agent_score: 6,
      ts: 0,
      prompt: "some prompt text",
    })
    trackerMain(JSON.stringify({ tool_name: "Bash", tool_input: {} }), deps)

    const memDir = memoryDir(deps.home, deps.cwd, deps)
    const ignoredContent = files.get(`${memDir}/ignored-skills.md`) || ""
    expect(ignoredContent).not.toContain("low-score-skill |")
    expect(ignoredContent).toContain("strong-agent |")
  }

  // AC-14 fail-open: last-suggestion.json contains invalid JSON -> treated as absent,
  // main never throws, writes nothing.
  {
    const { fs, files } = makeFakeFs()
    const deps = baseDeps(fs)
    files.set(lastSuggestionPath(deps), "{ not valid json")
    expect(() => trackerMain(JSON.stringify({ tool_name: "Bash", tool_input: {} }), deps)).not.toThrow()
    expect(files.size).toBe(1) // only the untouched, still-corrupt suggestion file
  }

  // AC-14 fail-open: tool-stats.json contains invalid JSON -> treated as {} (empty),
  // recordUse still succeeds and writes a fresh, valid entry.
  {
    const { fs, files } = makeFakeFs()
    const deps = baseDeps(fs)
    writeSuggestion(deps, files, { skill: "code-review", agent: "", skill_score: 6, agent_score: 0, ts: 0 })
    const memDir = memoryDir(deps.home, deps.cwd, deps)
    files.set(`${memDir}/claude-tool-stats.json`, "{ not valid json")
    expect(() =>
      trackerMain(JSON.stringify({ tool_name: "Skill", tool_input: { skill: "code-review" } }), deps)
    ).not.toThrow()
    const stats = JSON.parse(files.get(`${memDir}/claude-tool-stats.json`) as string)
    expect(stats["code-review"].used).toBe(1)
  }
})

// C4: recordUse's/recordIgnore's write failures (EACCES/EROFS/ENOSPC) used to die inside
// the tracker's blind `catch {}` with ZERO signal — not even stderr. `main`'s contract
// (stdout ALWAYS empty, exit ALWAYS 0, never influence the turn) must still hold, but the
// failure must now be visible via `deps.warn` (a PostToolUse hook may write stderr without
// affecting the turn).
test("skill-usage-tracker main: a recordUse write failure surfaces via deps.warn, stdout still empty (C4)", () => {
  const { fs, files } = makeFakeFs()
  const { warn, messages } = makeWarnSpy()
  const deps = baseDeps(fs, { warn })
  writeSuggestion(deps, files, { skill: "code-review", agent: "", skill_score: 6, agent_score: 0, ts: 0 })

  const realWrite = fs.writeFileSync
  fs.writeFileSync = () => {
    throw new Error("EACCES: permission denied, open")
  }

  let out = ""
  expect(() => {
    out = trackerMain(JSON.stringify({ tool_name: "Skill", tool_input: { skill: "code-review" } }), deps)
  }).not.toThrow()
  expect(out).toBe("")
  expect(messages.some((m) => m.startsWith("[TRACKER WARNING]") && m.includes("EACCES"))).toBe(true)
  fs.writeFileSync = realWrite
})

// C4: same guarantee on the recordIgnore path.
test("skill-usage-tracker main: a recordIgnore write failure surfaces via deps.warn, stdout still empty (C4)", () => {
  const { fs, files } = makeFakeFs()
  const { warn, messages } = makeWarnSpy()
  const deps = baseDeps(fs, { now: () => 45_000, warn })
  writeSuggestion(deps, files, {
    skill: "code-review",
    agent: "",
    skill_score: 5,
    agent_score: 0,
    ts: 0,
    prompt: "some prompt",
  })

  const realAppend = fs.appendFileSync
  fs.appendFileSync = () => {
    throw new Error("ENOSPC: no space left on device")
  }

  let out = ""
  expect(() => {
    out = trackerMain(JSON.stringify({ tool_name: "Bash", tool_input: {} }), deps)
  }).not.toThrow()
  expect(out).toBe("")
  expect(messages.some((m) => m.startsWith("[TRACKER WARNING]") && m.includes("ENOSPC"))).toBe(true)
  fs.appendFileSync = realAppend
})

// C3 end-to-end (via the tracker): a corrupt (`null`) claude-tool-stats.json used to make
// `recordIgnore` throw a TypeError mid-way — AFTER the ignored-skills.md append already
// happened — so `clearSuggestion()` (the very next line in the tracker's ignore branch)
// never ran, leaving the SAME suggestion on disk to be re-processed (and re-appended) on
// every subsequent tool call. Proven here: after the ignore fires once against a corrupt
// stats file, the suggestion must be gone (cleared), not stuck in a re-trigger loop.
test("skill-usage-tracker main: a corrupt tool-stats.json during an ignore never blocks clearSuggestion (C3 cascade)", () => {
  const { fs, files } = makeFakeFs()
  const deps = baseDeps(fs, { now: () => 45_000 })
  writeSuggestion(deps, files, {
    skill: "code-review",
    agent: "",
    skill_score: 5,
    agent_score: 0,
    ts: 0,
    prompt: "some prompt",
  })
  const memDir = memoryDir(deps.home, deps.cwd, deps)
  files.set(`${memDir}/claude-tool-stats.json`, "null")

  expect(() => trackerMain(JSON.stringify({ tool_name: "Bash", tool_input: {} }), deps)).not.toThrow()

  expect(files.has(lastSuggestionPath(deps))).toBe(false)
  const ignored = files.get(`${memDir}/ignored-skills.md`) || ""
  expect(ignored).toContain("code-review |")
  const stats = JSON.parse(files.get(`${memDir}/claude-tool-stats.json`) as string)
  expect(stats["code-review"].ignored).toBe(1)
})

// W10: a `last-suggestion.json` write failure inside skill-router.mjs used to be swallowed
// "best-effort" with zero signal — `skill-usage-tracker.mjs` then has nothing to read and
// silently never records use/ignore again, while the router's own printed output looked
// perfectly healthy. Fixed by appending a `[ROUTER WARNING]` line to the visible output.
test("skill-router main: a last-suggestion.json write failure emits [ROUTER WARNING] (W10)", () => {
  const { fs, files } = makeFakeFs()
  const deps = baseDeps(fs)
  files.set(skillsIndexPath(deps), "turbo-cache\tcache cache cache invalidation layer\n")

  const realWrite = fs.writeFileSync
  fs.writeFileSync = (p: string, data: string) => {
    if (p === lastSuggestionPath(deps)) throw new Error("EROFS: read-only file system")
    return realWrite(p, data)
  }

  const out = routerMain(JSON.stringify({ prompt: "please cache it correctly today" }), deps)
  expect(out.startsWith("[OBLIGATORIO]")).toBe(true) // the visible routing block is unaffected
  expect(out).toContain("[ROUTER WARNING]")
  expect(out).toContain("EROFS")
  expect(out).toContain("use/ignore tracking is INACTIVE")
})

// F1: `grep -n cwd gate/claude/skill-usage-tracker.mjs` had ZERO matches — the tracker
// always wrote into `memoryDir(deps.home, deps.cwd, deps)`, where `deps.cwd` is the hook
// SUBPROCESS's own `process.cwd()` in production. Meanwhile skill-router.mjs's `parseInput`
// + `runDeps = cwd ? {...deps, cwd} : deps` reads the PROJECT cwd Claude Code reports in the
// event JSON. Whenever those two diverge (multi-root workspaces, subshells, subagents,
// worktrees), the writer (tracker) and the reader (`adjust()`, via the router) silently
// target DIFFERENT directories — the "3+ ignores -> +2 escalation" loop decouples with zero
// signal. Fixed: the tracker must honour `evt.cwd` exactly like the router does.
test("skill-usage-tracker main: honours evt.cwd for memoryDir, not the subprocess's own deps.cwd (F1)", () => {
  const { fs, files, dirs } = makeFakeFs()
  const deps = baseDeps(fs, { cwd: "/home/u/subshell", now: () => 45_000 })
  const evtCwd = "/home/u/project"
  const evtMemDir = "/home/u/.claude/projects/-home-u-project/memory"
  // Pre-exists -> memoryDirsOf's most-specific candidate for evt.cwd is picked (not the
  // routerStateDir fallback), so a wrong cwd source is unambiguously distinguishable.
  dirs.set(evtMemDir, [])

  writeSuggestion(deps, files, {
    skill: "code-review",
    agent: "",
    skill_score: 5,
    agent_score: 0,
    ts: 0,
    prompt: "some prompt text",
  })

  trackerMain(JSON.stringify({ tool_name: "Bash", tool_input: {}, cwd: evtCwd }), deps)

  expect(files.has(`${evtMemDir}/ignored-skills.md`)).toBe(true)
  expect(files.has(`${evtMemDir}/claude-tool-stats.json`)).toBe(true)

  // Never wrote into a dir keyed off the subprocess's OWN deps.cwd: its project-memory dir
  // doesn't exist, so a bug that still reads deps.cwd would fall back to routerStateDir.
  const subshellMemDir = "/home/u/.claude/projects/-home-u-subshell/memory"
  const routerStateDir = "/home/u/.claude/.router-cache/state"
  expect(files.has(`${subshellMemDir}/ignored-skills.md`)).toBe(false)
  expect(files.has(`${routerStateDir}/ignored-skills.md`)).toBe(false)
})

// F1 end-to-end: prove the loop actually CLOSES, not just that paths match in isolation.
// The tracker records 3 ignores for the same skill (each via evt.cwd, NOT the tracker
// subprocess's own deps.cwd), then the router — invoked with that SAME cwd, from a
// DIFFERENT deps.cwd of its own — must see them via adjust() and apply the +2 bump.
test("skill-usage-tracker + skill-router: 3 evt.cwd-recorded ignores close the adjust() +2 loop end-to-end (F1)", () => {
  const { fs, files, dirs } = makeFakeFs()
  const projectCwd = "/home/u/project"
  const memDir = "/home/u/.claude/projects/-home-u-project/memory"
  dirs.set(memDir, [])

  const trackerDeps = baseDeps(fs, { cwd: "/home/u/tracker-subprocess-cwd" })
  for (let i = 0; i < 3; i++) {
    writeSuggestion(trackerDeps, files, {
      skill: "turbo-parser",
      agent: "",
      skill_score: 5,
      agent_score: 0,
      ts: 0,
      prompt: "some prompt text",
    })
    trackerMain(
      JSON.stringify({ tool_name: "Bash", tool_input: {}, cwd: projectCwd }),
      { ...trackerDeps, now: () => 45_000 },
    )
  }

  const ignored = files.get(`${memDir}/ignored-skills.md`) || ""
  expect(ignored.split("\n").filter((l) => l.startsWith("turbo-parser |")).length).toBe(3)

  // Router invoked with a DIFFERENT deps.cwd of its own — only the event's `cwd` field
  // (matching the tracker's evt.cwd above) must determine which memoryDir adjust() reads.
  const routerDeps = baseDeps(fs, { cwd: "/home/u/router-subprocess-cwd" })
  files.set(skillsIndexPath(routerDeps), "unrelated-skill\tsomething totally different topic\n")
  files.set(agentsIndexPath(routerDeps), "turbo-parser\thandles data files efficiently\n")

  const out = routerMain(JSON.stringify({ prompt: "please turbo it now", cwd: projectCwd }), routerDeps)
  expect(out).toContain("turbo-parser(5)")
  expect(out).not.toContain("turbo-parser(3)")
})
