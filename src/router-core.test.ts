import { test, expect } from "bun:test"
import {
  tokenize, STOPWORDS, bigrams, classify, scoreRouter, scoreGate, memoryDir,
  adjust, recordUse, recordIgnore, shouldIgnore, detectTech,
} from "../gate/core/router-core.mjs"
import nodePath from "node:path"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

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
type CoreDeps = {
  fs: FsStub
  env: Record<string, string | undefined>
  home: string
  cwd: string
  spawn: (cmd: string, args: string[], o: object) => { stdout: string; status: number }
  now: () => number
  path: typeof posix
}

/** Hermetic in-memory fs stub satisfying the full FsLike contract. */
function makeFakeFs(readOverride?: (p: string) => string) {
  const files = new Map<string, string>()
  const dirs = new Set<string>()
  const writeCalls: { path: string; data: string }[] = []
  const appendCalls: { path: string; data: string }[] = []
  const fs: FsStub = {
    existsSync: (p) => files.has(p) || dirs.has(p),
    readFileSync:
      readOverride ||
      ((p) => {
        if (!files.has(p)) throw new Error(`ENOENT: ${p}`)
        return files.get(p) as string
      }),
    writeFileSync: (p, data) => {
      writeCalls.push({ path: p, data })
      files.set(p, data)
    },
    appendFileSync: (p, data) => {
      appendCalls.push({ path: p, data })
      files.set(p, (files.get(p) || "") + data)
    },
    mkdirSync: (p) => {
      dirs.add(p)
    },
    readdirSync: () => [],
    statSync: () => {
      throw new Error("not implemented")
    },
    rmSync: (p) => {
      files.delete(p)
      dirs.delete(p)
    },
    renameSync: (from, to) => {
      if (!files.has(from)) throw new Error(`ENOENT: ${from}`)
      files.set(to, files.get(from) as string)
      files.delete(from)
    },
  }
  return { fs, files, dirs, writeCalls, appendCalls }
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
    ...overrides,
  }
}

// AC-1: tokenize lowercases, splits on non-alnum, drops <3-char tokens and stopwords.
test("tokenize: drops stopwords and sub-3-char tokens (AC-1)", () => {
  expect(tokenize("please cache it correctly today")).toEqual(["cache", "correctly", "today"])
})

// AC-5 regression guard: the accented "también" must be in STOPWORDS (the literal bug
// that let skill-enforcer.ts's buggy copy silently turn a suggested(4) into required(5)).
test("tokenize: accented también is a stopword (AC-5 regression guard)", () => {
  expect(STOPWORDS.has("también")).toBe(true)
  expect(tokenize("necesito notas también")).toEqual(["necesito", "notas"])
})

test("bigrams: joins adjacent tokens with underscore", () => {
  expect(bigrams(["cache", "correctly", "today"])).toEqual(["cache_correctly", "correctly_today"])
  expect(bigrams([])).toEqual([])
  expect(bigrams(["x"])).toEqual([])
})

// AC-3/AC-4/AC-5 boundary matrix: STRONG=6, hardCap=4, LEADER=5 fallback.
test("classify: STRONG/LEADER boundary matrix (AC-3/AC-4/AC-5)", () => {
  // score 6 -> required via STRONG
  expect(classify([{ name: "a", score: 6 }])).toEqual({ required: ["a"], suggested: [] })
  // score 5, nothing >= STRONG -> required via LEADER fallback
  expect(classify([{ name: "a", score: 5 }])).toEqual({ required: ["a"], suggested: [] })
  // score 4, below LEADER -> suggested only
  expect(classify([{ name: "a", score: 4 }])).toEqual({ required: [], suggested: ["a"] })
  // score 3 -> suggested only
  expect(classify([{ name: "a", score: 3 }])).toEqual({ required: [], suggested: ["a"] })
})

// AC-1: scoreRouter reproduces skill-router.sh's awk math exactly.
test("scoreRouter: exact bash math (AC-1 fixtures)", () => {
  const idx1 = [{ name: "turbo-cache", desc: "cache cache cache invalidation layer" }]
  expect(scoreRouter("please cache it correctly today", idx1)).toMatchObject([{ name: "turbo-cache", score: 6 }])

  const idx2 = [{ name: "report-gen", desc: "reports reports quickly compiled" }]
  expect(scoreRouter("can we get reports done please", idx2)).toMatchObject([{ name: "report-gen", score: 2 }])

  const idx3 = [{ name: "turbo-parser", desc: "handles data files efficiently" }]
  expect(scoreRouter("please turbo it now", idx3)).toMatchObject([{ name: "turbo-parser", score: 3 }])
})

// AC-1 edge cases: bigram scoring branch + stable tie-break.
test("scoreRouter: bigram match scores +2/+2 and ties are stable", () => {
  // desc="turbo cache invalidation", prompt="turbo cache now" -> filtered=[turbo,cache,now]
  // turbo: desc has 1 occurrence -> +1 (name "x" no substring match) = 1
  // cache: desc has 1 occurrence -> +1 (name no match) = 1
  // now:   desc has 0 occurrences, no name match = 0
  // bigram turbo_cache -> "turbo cache" is a desc substring -> +2 (name no match)
  // bigram cache_now   -> "cache now" is NOT a desc substring -> 0
  // total = 1 + 1 + 0 + 2 = 4
  const idx = [{ name: "x", desc: "turbo cache invalidation" }]
  expect(scoreRouter("turbo cache now", idx)).toMatchObject([{ name: "x", score: 4 }])

  // A row whose NAME contains the bigram (with underscore->space) also scores +2.
  const idxNameBigram = [{ name: "turbo-cache", desc: "unrelated text here" }]
  // filtered=[turbo,cache,now]; turbo: desc 0, name "turbo cache" includes "turbo" -> +3
  // cache: desc 0, name includes "cache" -> +3; now: 0
  // bigram turbo_cache -> "turbo cache" desc? no. name "turbo cache" includes "turbo cache"? yes -> +2
  // bigram cache_now -> neither -> 0
  // total = 3 + 3 + 0 + 2 = 8
  expect(scoreRouter("turbo cache now", idxNameBigram)).toMatchObject([{ name: "turbo-cache", score: 8 }])

  // Tie stability: two rows with equal score preserve insertion order.
  const tieIdx = [
    { name: "first", desc: "cache" },
    { name: "second", desc: "cache" },
  ]
  const tied = scoreRouter("cache", tieIdx)
  expect(tied.map((r: { name: string }) => r.name)).toEqual(["first", "second"])
})

// AC-2: scoreGate reproduces skill-gate-lib.mjs's weighted math exactly, AMBIENT-aware.
test("scoreGate: AMBIENT down-weight + Set dedup (AC-2)", () => {
  const idx1 = [{ name: "claude-code-guide", desc: "guide for claude code hooks and configuration" }]
  // minScore:0 exposes the raw math so the exact 1.75 total is directly assertable.
  const scored1raw = scoreGate("test claude code hooks", idx1, { minScore: 0 })
  expect(scored1raw).toMatchObject([{ name: "claude-code-guide", desc: idx1[0].desc, score: 1.75 }])
  // Default filtering (>= SOFT_MIN=3) matches skill-gate-lib.mjs's scoreSkills: this row
  // never surfaces — a purely meta/testing prompt must not force claude-code-guide.
  expect(scoreGate("test claude code hooks", idx1)).toEqual([])

  const idx2 = [{ name: "notas-utility", desc: "crea notas y tambien recordatorios, también historial" }]
  const scored2 = scoreGate("necesito notas también", idx2)
  expect(scored2).toMatchObject([{ name: "notas-utility", desc: idx2[0].desc, score: 4 }])

  // Dedup proof: repeating "notas" 3x in the prompt scores identically to once.
  const scored3 = scoreGate("notas notas notas también", idx2)
  expect(scored3).toEqual(scored2)
})

// AC-7: memoryDir picks the first EXISTING candidate, else falls back to the 2nd.
test("memoryDir: picks first existing candidate, else falls back (AC-7)", () => {
  const home = "/home/u"
  const cwd = "/home/u/proj"
  const primary = "/home/u/.claude/projects/-home-u-proj/memory"
  const fallback = "/home/u/.claude/.router-cache/state"

  // Candidate 1 exists -> returned.
  {
    const { fs, dirs } = makeFakeFs()
    dirs.add(primary)
    const deps = baseDeps(fs, { home, cwd })
    expect(memoryDir(home, cwd, deps)).toBe(primary)
  }

  // Candidate 1 absent -> candidate 2 (routerStateDir) returned.
  {
    const { fs } = makeFakeFs()
    const deps = baseDeps(fs, { home, cwd })
    expect(memoryDir(home, cwd, deps)).toBe(fallback)
  }
})

// AC-4/AC-14: adjust — ignored-skills.md bump.
test("adjust: +2 at >=3 ignores, +0 below, fail-open on unreadable file (AC-4/AC-14)", () => {
  const home = "/home/u"
  const cwd = "/home/u"
  const memDir = "/home/u/.claude/projects/-home-u/memory"
  const ignoredPath = `${memDir}/ignored-skills.md`

  // 3 matching lines -> base 4 + 2 = 6
  {
    const { fs, files, dirs } = makeFakeFs()
    dirs.add(memDir)
    files.set(
      ignoredPath,
      "turbo-parser | t1 | 4 | skill | x\nturbo-parser | t2 | 4 | skill | x\nturbo-parser | t3 | 4 | skill | x\n"
    )
    expect(adjust("turbo-parser", 4, baseDeps(fs, { home, cwd }))).toBe(6)
  }

  // 2 matching lines -> bump stays 0
  {
    const { fs, files, dirs } = makeFakeFs()
    dirs.add(memDir)
    files.set(ignoredPath, "turbo-parser | t1 | 4 | skill | x\nturbo-parser | t2 | 4 | skill | x\n")
    expect(adjust("turbo-parser", 4, baseDeps(fs, { home, cwd }))).toBe(4)
  }

  // unreadable file (permissions error) -> fail-open, bump defaults to 0
  {
    const { fs, dirs } = makeFakeFs(() => {
      throw new Error("EACCES: permission denied")
    })
    dirs.add(memDir)
    dirs.add(ignoredPath) // existsSync -> true, but readFileSync throws (permissions)
    expect(adjust("turbo-parser", 4, baseDeps(fs, { home, cwd }))).toBe(4)
  }
})

// AC-10: recordUse increments `used`, leaves `ignored` untouched.
test("recordUse: increments used, leaves ignored untouched (AC-10)", () => {
  const home = "/home/u"
  const cwd = "/home/u"
  const memDir = "/home/u/.claude/projects/-home-u/memory"
  const statsPath = `${memDir}/claude-tool-stats.json`
  const { fs, files, dirs, writeCalls } = makeFakeFs()
  dirs.add(memDir)
  files.set(statsPath, JSON.stringify({ "code-review": { used: 2, ignored: 1 } }))

  recordUse("code-review", baseDeps(fs, { home, cwd }))

  expect(writeCalls.length).toBe(1)
  expect(writeCalls[0].path).toBe(statsPath)
  expect(JSON.parse(writeCalls[0].data)).toEqual({ "code-review": { used: 3, ignored: 1 } })
})

// C3: a corrupt (non-object) `claude-tool-stats.json` must not crash `recordUse`/
// `recordIgnore` — `JSON.parse` happily succeeds on `null`/`[]`/`"x"`/`3`, only a THROW
// falls back to the caller's default. Pre-fix, `stats[name]` on a `null`/array value threw
// a TypeError swallowed by the tracker's blind catch — worse, in `recordIgnore` the
// ignored-skills.md line had ALREADY been appended before the crash, so `clearSuggestion()`
// (the caller, in skill-usage-tracker.mjs) never ran, and the SAME suggestion got
// re-appended on every subsequent tool call, cascading into a runaway HARD escalation.
// Fixed by validating shape in `readJsonSafe` (discard + fallback to `{}`, never crash) AND
// by never letting recordUse/recordIgnore throw at all (C4: they catch their own write
// errors and return a message instead) — together these close the whole cascade.
test("recordUse/recordIgnore: a corrupt (non-object) stats file is discarded, never crashes (C3)", () => {
  const home = "/home/u"
  const cwd = "/home/u"
  const memDir = "/home/u/.claude/projects/-home-u/memory"
  const statsPath = `${memDir}/claude-tool-stats.json`

  for (const corrupt of ["null", "[1,2,3]", '"just a string"', "42"]) {
    const { fs, files, dirs } = makeFakeFs()
    dirs.add(memDir)
    files.set(statsPath, corrupt)
    const deps = baseDeps(fs, { home, cwd })

    expect(() => recordUse("code-review", deps)).not.toThrow()
    const written = files.get(statsPath) as string
    expect(JSON.parse(written)).toEqual({ "code-review": { used: 1, ignored: 0 } })
  }

  // Same guarantee on the recordIgnore path — and the append (ignored-skills.md) must
  // still have happened even though the stats file was corrupt (proving the append isn't
  // rolled back or skipped just because the stats side needed a fallback).
  {
    const { fs, files, dirs } = makeFakeFs()
    dirs.add(memDir)
    files.set(statsPath, "null")
    const deps = baseDeps(fs, { home, cwd, now: () => 0 })

    expect(() => recordIgnore("turbo-parser", 4, "skill", "x", deps)).not.toThrow()
    const ignored = files.get(`${memDir}/ignored-skills.md`) || ""
    expect(ignored).toContain("turbo-parser |")
    const stats = JSON.parse(files.get(statsPath) as string)
    expect(stats).toEqual({ "turbo-parser": { used: 0, ignored: 1 } })
  }
})

// C4: recordUse/recordIgnore must never let a write failure (EACCES/EROFS/ENOSPC) escape
// as an uncaught exception — the caller (skill-usage-tracker.mjs's main) must be able to
// surface it as a `[TRACKER WARNING]` on stderr instead of a blind, silent catch. Fixed by
// catching the write internally and RETURNING a non-null error message (never throwing).
test("recordUse/recordIgnore: a writeFileSync failure is captured and returned, never thrown (C4)", () => {
  const home = "/home/u"
  const cwd = "/home/u"
  const memDir = "/home/u/.claude/projects/-home-u/memory"
  const { fs, dirs } = makeFakeFs()
  dirs.add(memDir)
  fs.writeFileSync = () => {
    throw new Error("EACCES: permission denied, open")
  }
  const deps = baseDeps(fs, { home, cwd })

  let result: string | null = null
  expect(() => {
    result = recordUse("code-review", deps)
  }).not.toThrow()
  expect(result).toBeTruthy()
  expect(String(result)).toContain("EACCES")

  let ignoreResult: string | null = null
  expect(() => {
    ignoreResult = recordIgnore("turbo-parser", 4, "skill", "x", deps)
  }).not.toThrow()
  expect(ignoreResult).toBeTruthy()
})

// AC-10: recordIgnore appends the formatted line, increments the counter, truncates the snippet.
test("recordIgnore: appends formatted line, increments counter, truncates snippet (AC-10)", () => {
  const home = "/home/u"
  const cwd = "/home/u"
  const memDir = "/home/u/.claude/projects/-home-u/memory"
  const ignoredPath = `${memDir}/ignored-skills.md`
  const statsPath = `${memDir}/claude-tool-stats.json`
  const { fs, files, dirs, writeCalls, appendCalls } = makeFakeFs()
  dirs.add(memDir)
  files.set(statsPath, JSON.stringify({}))

  const frozenMs = new Date("2026-01-01T12:00:00.000Z").getTime()
  const deps = baseDeps(fs, { home, cwd, now: () => frozenMs })
  const longSnippet = "x".repeat(150)
  recordIgnore("turbo-parser", 5, "skill", longSnippet, deps)

  expect(appendCalls.length).toBe(1)
  expect(appendCalls[0].path).toBe(ignoredPath)
  const expectedIso = new Date(frozenMs).toISOString()
  expect(appendCalls[0].data).toBe(`turbo-parser | ${expectedIso} | 5 | skill | ${"x".repeat(100)}\n`)

  const statsWrite = writeCalls.find((w) => w.path === statsPath)
  expect(statsWrite).toBeTruthy()
  expect(JSON.parse((statsWrite as { path: string; data: string }).data)).toEqual({
    "turbo-parser": { used: 0, ignored: 1 },
  })
})

// AC-10: shouldIgnore — pure predicate, 30s + score>=3 gate, skill/agent independent.
test("shouldIgnore: 30s + score>=3 gate, skill/agent independent (AC-10)", () => {
  const ts = 0
  expect(shouldIgnore(45_000, { ts, skill_score: 5, agent_score: 0 }, "Bash")).toEqual({ skill: true, agent: false })
  expect(shouldIgnore(20_000, { ts, skill_score: 5, agent_score: 0 }, "Bash")).toEqual({ skill: false, agent: false })
  expect(shouldIgnore(45_000, { ts, skill_score: 2, agent_score: 0 }, "Bash")).toEqual({ skill: false, agent: false })
  expect(shouldIgnore(45_000, { ts, skill_score: 5, agent_score: 5 }, "WebFetch")).toEqual({
    skill: false,
    agent: false,
  })
})

// Suggestion (QA iteration 2): a `last-suggestion.json` missing `ts` (or any non-finite
// value) must NOT silently disable ignore-tracking forever. Pre-fix, `nowMs - suggestion.ts`
// was `NaN` whenever `ts` was `undefined`/non-numeric, and `NaN > 30_000` is ALWAYS `false`
// — no matter how much time elapses, `shouldIgnore` would never fire again for that
// suggestion, and the feature looked perfectly healthy (no error, no warning). A missing/
// invalid `ts` is treated as "old enough" (elapsed = Infinity) instead of "never old enough".
test("shouldIgnore: a missing/invalid `ts` does not permanently disable ignore-tracking (NaN guard, suggestion)", () => {
  expect(shouldIgnore(45_000, { skill_score: 5, agent_score: 0 }, "Bash")).toEqual({ skill: true, agent: false })
  expect(shouldIgnore(45_000, { ts: "not-a-number", skill_score: 5, agent_score: 0 }, "Bash")).toEqual({
    skill: true,
    agent: false,
  })
  expect(shouldIgnore(45_000, { ts: NaN, skill_score: 5, agent_score: 0 }, "Bash")).toEqual({
    skill: true,
    agent: false,
  })
})

// detectTech: first-match-wins over the ported TECH_KEYWORDS map (AC-11 precondition).
test("detectTech: first-match-wins over the ported TECH map", () => {
  expect(detectTech("necesito ayuda con laravel y react")).toBe("laravel")
  expect(detectTech("no tech mentioned")).toBe("")
  expect(detectTech("uso next.js")).toBe("next.js")
})

// K5: scoreRouter must tokenize with skill-router.sh's OWN stopword list (its `:138`
// bash string), not the gate's `STOPWORDS` set. The two lists materially differ —
// "proyecto" is a router-only stopword (bash keeps it out of scoring), so a hand-copy
// that reuses the gate's list (which lacks "proyecto") lets it leak into scoring,
// silently diverging from bash's real output for ordinary Spanish prompts.
test("scoreRouter: tokenizes with the ROUTER's own stopword list (skill-router.sh:138), not the gate's (K5)", () => {
  // desc deliberately repeats "proyecto" so a pre-fix (gate-stopword) token set would
  // score it via both the desc-substring count AND the name-substring bonus.
  const idx = [{ name: "proyecto-helper", desc: "ayuda con proyecto y tareas" }]
  const scored = scoreRouter("mi proyecto necesita ayuda", idx)
  // Bash-faithful: "proyecto" is dropped before scoring even reaches this row, so only
  // "necesita"(0 hits in desc) + "ayuda"(1 hit in desc) count -> score 1.
  expect(scored).toMatchObject([{ name: "proyecto-helper", score: 1 }])
})

// W3/hermeticity: every exported router-core function except `defaultDeps` itself (and
// the two Claude-hook `main()`s, which live in OTHER files) must require `deps`
// explicitly — a default `deps = defaultDeps()` silently pulls in the real
// fs/env/homedir/cwd whenever a caller forgets to inject it. Two concrete leaks already
// existed in this tree: `src/router-parity.test.ts:48`'s bare `loadIndex(indexPath)`
// and `gate/claude/skill-gate-lib.mjs:24`'s module-scope `homedir()` call feeding a
// bare `coreLoadIndex(indexPath)` — `src/paths.ts:80-82` documents this exact footgun
// as forbidden, and router-core.mjs repeated it in its own public API.
test("router-core: no exported function other than defaultDeps() defaults `deps` (W3, hermeticity)", () => {
  const src = readFileSync(join(ROOT, "gate/core/router-core.mjs"), "utf8")
  const offenders = [...src.matchAll(/export function (\w+)\([^)]*deps\s*=\s*defaultDeps\(\)/g)]
    .map((m) => m[1])
    .filter((name) => name !== "defaultDeps")
  expect(offenders).toEqual([])
})
