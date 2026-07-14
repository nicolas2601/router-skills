import { test, expect } from "bun:test"
import nodePath from "node:path"
import { createHash } from "node:crypto"
import { npxFind } from "../gate/core/router-core.mjs"

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
type SpawnResult = { stdout: string; status: number | null; error?: Error & { code?: string } }
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

/** Spy sink for `deps.warn` — records every message so a test can assert on it. */
function makeWarnSpy() {
  const messages: string[] = []
  return { warn: (msg: string) => messages.push(msg), messages }
}

function makeSpawnCounter(impl?: SpawnFn) {
  const calls: { cmd: string; args: string[]; opts: object }[] = []
  const spawn: SpawnFn = (cmd, args, opts) => {
    calls.push({ cmd, args, opts })
    return impl ? impl(cmd, args, opts) : { stdout: "", status: 0 }
  }
  return { spawn, calls }
}

function makeFsStub() {
  const files = new Map<string, string>()
  const stats = new Map<string, { mtimeMs: number }>()
  const dirs = new Set<string>()
  const fs: FsStub = {
    existsSync: (p) => files.has(p) || dirs.has(p),
    readFileSync: (p) => {
      if (!files.has(p)) throw new Error(`ENOENT: ${p}`)
      return files.get(p) as string
    },
    writeFileSync: (p, data) => {
      files.set(p, data)
      stats.set(p, { mtimeMs: 0 })
    },
    appendFileSync: () => {},
    mkdirSync: (p) => {
      dirs.add(p)
    },
    readdirSync: () => [],
    statSync: (p) => {
      const s = stats.get(p)
      if (!s) throw new Error(`ENOENT: ${p}`)
      return { isDirectory: () => false, isFile: () => true, mtimeMs: s.mtimeMs, size: (files.get(p) || "").length }
    },
    rmSync: () => {},
    renameSync: (from, to) => {
      if (files.has(from)) {
        files.set(to, files.get(from) as string)
        files.delete(from)
      }
      if (stats.has(from)) {
        stats.set(to, stats.get(from) as { mtimeMs: number })
        stats.delete(from)
      }
    },
  }
  return { fs, files, stats, dirs }
}

function baseDeps(fs: FsStub, spawn: SpawnFn, overrides: Partial<CoreDeps> = {}): CoreDeps {
  return {
    fs,
    env: {},
    home: "/home/u",
    cwd: "/home/u",
    spawn,
    now: () => 0,
    path: posix,
    warn: () => {},
    ...overrides,
  }
}

// AC-11: OFF by default (env unset or not "1") — spawn is never called.
test("npxFind: spawn never called when SKILLFORGE_NPX_FIND is unset (AC-11)", () => {
  const { spawn, calls } = makeSpawnCounter()
  const { fs } = makeFsStub()

  const depsUnset = baseDeps(fs, spawn)
  expect(npxFind("laravel", depsUnset)).toBe("")
  expect(calls.length).toBe(0)

  const depsZero = baseDeps(fs, spawn, { env: { SKILLFORGE_NPX_FIND: "0" } })
  expect(npxFind("laravel", depsZero)).toBe("")
  expect(calls.length).toBe(0)
})

// AC-11: ON path — cache miss calls spawn once, caches by sha256 key.
test("npxFind: SKILLFORGE_NPX_FIND=1 calls spawn once and caches by sha256 key (AC-11)", () => {
  const { spawn, calls } = makeSpawnCounter(() => ({ stdout: "some-skill-result\n", status: 0 }))
  const { fs, files } = makeFsStub()
  const deps = baseDeps(fs, spawn, { env: { SKILLFORGE_NPX_FIND: "1" } })

  // W2: a single, sanitized line has no trailing newline once passed through
  // sanitizeNpxOutput (the bash pipeline's `grep -v '^$'` drops the trailing blank
  // line produced by the source stdout's own trailing "\n").
  const out = npxFind("laravel", deps)
  expect(out).toBe("some-skill-result")
  expect(calls.length).toBe(1)
  expect(calls[0].cmd).toBe("npx")
  expect(calls[0].args).toEqual(["--yes", "skills", "find", "laravel"])

  const key = createHash("sha256").update("laravel").digest("hex")
  const cacheFile = `/home/u/.claude/.router-cache/npx-cache/${key}`
  expect(files.get(cacheFile)).toBe("some-skill-result")
})

// K2: spawnSync (used synchronously) IGNORES the `signal` option entirely — only the
// async spawn/exec APIs honour AbortSignal. `setTimeout(() => controller.abort(), 5000)`
// never fires because spawnSync blocks the event loop, so a real cold `npx --yes skills
// find` would hang the UserPromptSubmit hook indefinitely with SKILLFORGE_NPX_FIND=1.
// Fix: pass spawnSync's OWN `timeout` option instead of AbortController theatre.
test("npxFind: passes spawnSync's own `timeout` option (K2) — no AbortController/signal", () => {
  const { spawn, calls } = makeSpawnCounter(() => ({ stdout: "result", status: 0 }))
  const { fs } = makeFsStub()
  const deps = baseDeps(fs, spawn, { env: { SKILLFORGE_NPX_FIND: "1" } })

  npxFind("laravel", deps)
  expect(calls.length).toBe(1)
  const opts = calls[0].opts as Record<string, unknown>
  expect(opts.timeout).toBe(5000)
  expect(opts.killSignal).toBe("SIGKILL")
  expect(opts.encoding).toBe("utf8")
  // The AbortController-based `signal` option must be GONE — spawnSync ignores it
  // silently, so its presence would be dead, misleading code, not a real timeout.
  expect("signal" in opts).toBe(false)
})

// W2: raw npx stdout is capped, ANSI-stripped, and banner-free — mirroring the bash
// source's own pipeline (`head -c 2500 | sed 's/\x1b\[[0-9;]*m//g' | head -n 20 |
// grep -v banner-glyphs | head -n 15`). Pre-fix, the port injected the FULL raw stdout
// unbounded into the model's context — context bloat AND a prompt-injection surface
// (untrusted registry text entering context as if it were an instruction).
test("npxFind: sanitizes npx stdout — caps length, strips ANSI, drops banner glyphs (W2)", () => {
  const ansiLine = "\x1b[32msome-skill\x1b[0m — a real result"
  const bannerLines = ["████████████", "╔══════════╗", "║  SKILLS  ║", "╚══════════╝"]
  const manyLines = Array.from({ length: 30 }, (_, i) => `line-${i}: filler content here`)
  const rawStdout = [ansiLine, ...bannerLines, ...manyLines].join("\n") + "\n" + "x".repeat(3000)

  const { spawn } = makeSpawnCounter(() => ({ stdout: rawStdout, status: 0 }))
  const { fs } = makeFsStub()
  const deps = baseDeps(fs, spawn, { env: { SKILLFORGE_NPX_FIND: "1" } })

  const out = npxFind("laravel", deps)

  // No raw ANSI escape sequences survive.
  expect(out).not.toMatch(/\x1b\[[0-9;]*m/)
  // No banner glyphs survive.
  for (const glyph of ["█", "╔", "╗", "╚", "╝", "║", "═"]) {
    expect(out.includes(glyph)).toBe(false)
  }
  // Capped: at most 15 lines survive (bash's final `head -n 15`).
  expect(out.split("\n").length).toBeLessThanOrEqual(15)
  // Capped: nowhere near the raw 3000+-char tail (bash caps the SOURCE at 2500 chars
  // before line-splitting, so a giant single "line" like the `x`-repeat tail can't
  // survive at its full length either).
  expect(out.length).toBeLessThan(2500)
})

// AC-11: cache TTL — <1h skips spawn (returns cached value); >1h re-spawns and overwrites.
test("npxFind: cache hit <1h skips spawn, >1h re-spawns (AC-11)", () => {
  const key = createHash("sha256").update("laravel").digest("hex")
  const cacheFile = `/home/u/.claude/.router-cache/npx-cache/${key}`

  // <1h: cache entry at t=0, now=30min -> spawn NOT called, cached value returned.
  {
    const { spawn, calls } = makeSpawnCounter(() => ({ stdout: "FRESH", status: 0 }))
    const { fs, files, stats } = makeFsStub()
    files.set(cacheFile, "CACHED-VALUE")
    stats.set(cacheFile, { mtimeMs: 0 })
    const deps = baseDeps(fs, spawn, { env: { SKILLFORGE_NPX_FIND: "1" }, now: () => 30 * 60 * 1000 })
    expect(npxFind("laravel", deps)).toBe("CACHED-VALUE")
    expect(calls.length).toBe(0)
  }

  // >1h: cache entry at t=0, now=90min -> spawn IS called, entry overwritten.
  {
    const { spawn, calls } = makeSpawnCounter(() => ({ stdout: "FRESH-RESULT", status: 0 }))
    const { fs, files, stats } = makeFsStub()
    files.set(cacheFile, "STALE-VALUE")
    stats.set(cacheFile, { mtimeMs: 0 })
    const deps = baseDeps(fs, spawn, { env: { SKILLFORGE_NPX_FIND: "1" }, now: () => 90 * 60 * 1000 })
    expect(npxFind("laravel", deps)).toBe("FRESH-RESULT")
    expect(calls.length).toBe(1)
    expect(files.get(cacheFile)).toBe("FRESH-RESULT")
  }
})

// AC-11/AC-14: a throwing spawn (simulating a fired 5s abort) fails open to "".
test("npxFind: spawn throw (timeout) fails open to empty string (AC-11)", () => {
  const spawn: SpawnFn = () => {
    throw new Error("The operation was aborted")
  }
  const { fs } = makeFsStub()
  const deps = baseDeps(fs, spawn, { env: { SKILLFORGE_NPX_FIND: "1" } })
  expect(npxFind("laravel", deps)).toBe("")
})

// W2: `spawnSync` does NOT throw on a timeout/failure — it returns `{error, status, stdout}`
// with a possibly non-empty PARTIAL stdout. Pre-fix, npxFind only checked `result.stdout`
// truthiness, so a timed-out/failed npx yielded partial garbage that got sanitized, CACHED
// for 1h, and injected into the model's context inside the EXTERNAL DATA fence as if it
// were a valid result. Fixed by rejecting any run with `result.error` or a non-zero
// `result.status` — before sanitizing OR caching.
test("npxFind: a spawnSync result with `error` set is rejected — never cached, never returned (W2)", () => {
  const { spawn, calls } = makeSpawnCounter(() => ({
    stdout: "partial garbage from a killed process",
    status: null,
    error: new Error("ETIMEDOUT"),
  }))
  const { fs, files } = makeFsStub()
  const deps = baseDeps(fs, spawn, { env: { SKILLFORGE_NPX_FIND: "1" } })

  expect(npxFind("laravel", deps)).toBe("")
  expect(calls.length).toBe(1)

  const key = createHash("sha256").update("laravel").digest("hex")
  const cacheFile = `/home/u/.claude/.router-cache/npx-cache/${key}`
  expect(files.has(cacheFile)).toBe(false)
})

// W2: a non-zero `status` (npx ran, exited with an error — e.g. package not found) with
// non-empty stdout must also be rejected, not trusted/cached.
test("npxFind: a spawnSync result with a non-zero status is rejected — never cached, never returned (W2)", () => {
  const { spawn } = makeSpawnCounter(() => ({
    stdout: "some misleading partial text",
    status: 1,
  }))
  const { fs, files } = makeFsStub()
  const deps = baseDeps(fs, spawn, { env: { SKILLFORGE_NPX_FIND: "1" } })

  expect(npxFind("laravel", deps)).toBe("")
  const key = createHash("sha256").update("laravel").digest("hex")
  const cacheFile = `/home/u/.claude/.router-cache/npx-cache/${key}`
  expect(files.has(cacheFile)).toBe(false)
})

// F2: `spawnSync` does NOT throw on a missing binary — it returns `{error: Error{code:
// 'ENOENT'}, status: null, stdout: null}`. Pre-fix, that fell through the SAME "" return as
// {error: undefined, status: 0, stdout: ""} ("ran fine, found nothing") — byte-identical,
// with no `deps.warn`, no signal, unlike every other degraded path in this module. Fixed:
// an ENOENT-shaped `result.error` gets a DISTINCT `deps.warn` call, still returns "", still
// never caches.
test("npxFind: spawnSync ENOENT (npx binary missing) warns with a distinguishable message, never cached (F2)", () => {
  const enoent = Object.assign(new Error("spawnSync npx ENOENT"), { code: "ENOENT" })
  const { spawn, calls } = makeSpawnCounter(() => ({
    stdout: null as unknown as string,
    status: null,
    error: enoent,
  }))
  const { fs, files } = makeFsStub()
  const { warn, messages } = makeWarnSpy()
  const deps = baseDeps(fs, spawn, { env: { SKILLFORGE_NPX_FIND: "1" }, warn })

  expect(npxFind("laravel", deps)).toBe("")
  expect(calls.length).toBe(1)
  expect(messages.length).toBe(1)
  expect(messages[0]).toContain("npx not found on PATH")
  expect(messages[0]).toContain("skill discovery unavailable")

  const key = createHash("sha256").update("laravel").digest("hex")
  const cacheFile = `/home/u/.claude/.router-cache/npx-cache/${key}`
  expect(files.has(cacheFile)).toBe(false)
})

// F2 (regression guard): the pre-existing "ran fine, found nothing" case (no error, status
// 0, empty stdout) must NOT warn — only the ENOENT case is diagnostically distinct.
test("npxFind: a clean run that found nothing does NOT warn (F2 regression guard)", () => {
  const { spawn } = makeSpawnCounter(() => ({ stdout: "", status: 0 }))
  const { fs } = makeFsStub()
  const { warn, messages } = makeWarnSpy()
  const deps = baseDeps(fs, spawn, { env: { SKILLFORGE_NPX_FIND: "1" }, warn })

  expect(npxFind("laravel", deps)).toBe("")
  expect(messages.length).toBe(0)
})
