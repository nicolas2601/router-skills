import { test, expect } from "bun:test"
import nodePath from "node:path"
import { buildSkillIndex, buildAgentIndex, loadIndex, needsRebuild, ensureIndex } from "../gate/core/router-core.mjs"

const posix = nodePath.posix

type Stat = { isDirectory: boolean; isFile: boolean; mtimeMs: number; size: number }
type FsStub = {
  existsSync: (p: string) => boolean
  readFileSync: (p: string, enc?: string) => string
  writeFileSync: (p: string, data: string) => void
  appendFileSync: (p: string, data: string) => void
  mkdirSync: (p: string, o?: { recursive?: boolean }) => void
  readdirSync: (p: string) => string[]
  statSync: (p: string) => { isDirectory: () => boolean; isFile: () => boolean; mtimeMs: number; size: number }
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

/**
 * Hermetic in-memory fs stub. Mirrors the `FsLike` contract from router-core's
 * injectable-deps interface. `statSync` returns pre-registered stats for a given
 * path directly — this is exactly what a real `statSync` does for a symlink (it
 * transparently returns the TARGET's stats), so registering `isDirectory:true` for
 * a "symlinked" skill entry's path is a faithful, hermetic stand-in for a real
 * symlink without touching the real filesystem.
 */
function makeFakeFs() {
  const files = new Map<string, string>()
  const dirs = new Map<string, string[]>()
  const stats = new Map<string, Stat>()
  const calls: { op: string; path: string }[] = []

  const fs: FsStub = {
    existsSync: (p) => files.has(p) || dirs.has(p),
    readFileSync: (p) => {
      calls.push({ op: "readFileSync", path: p })
      if (!files.has(p)) throw new Error(`ENOENT: ${p}`)
      return files.get(p) as string
    },
    writeFileSync: (p, data) => {
      calls.push({ op: "writeFileSync", path: p })
      files.set(p, data)
      stats.set(p, { isDirectory: false, isFile: true, mtimeMs: 0, size: data.length })
    },
    appendFileSync: (p, data) => {
      calls.push({ op: "appendFileSync", path: p })
      files.set(p, (files.get(p) || "") + data)
    },
    mkdirSync: () => {},
    readdirSync: (p) => {
      calls.push({ op: "readdirSync", path: p })
      if (!dirs.has(p)) throw new Error(`ENOENT: ${p}`)
      return dirs.get(p) as string[]
    },
    statSync: (p) => {
      calls.push({ op: "statSync", path: p })
      const s = stats.get(p)
      if (!s) throw new Error(`ENOENT: ${p}`)
      return { isDirectory: () => s.isDirectory, isFile: () => s.isFile, mtimeMs: s.mtimeMs, size: s.size }
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
      if (stats.has(from)) {
        stats.set(to, stats.get(from) as Stat)
        stats.delete(from)
      }
    },
  }
  return { fs, files, dirs, stats, calls }
}

function baseDeps(fs: FsStub): CoreDeps {
  return { fs, env: {}, home: "/home/u", cwd: "/home/u", spawn: () => ({ stdout: "", status: 0 }), now: () => 0, path: posix }
}

// AC-6: buildSkillIndex follows symlinks via statSync, top-level only.
test("buildSkillIndex: follows symlinks via statSync, top-level only (AC-6)", () => {
  const { fs, dirs, stats, files, calls } = makeFakeFs()
  const skillsDir = "/home/u/.claude/skills"
  const skillPath = `${skillsDir}/turbo-cache`
  const mdPath = `${skillPath}/SKILL.md`
  const nestedPath = `${skillPath}/sub/other.md`

  dirs.set(skillsDir, ["turbo-cache"])
  // Simulates a symlinked skill dir: statSync on it (not lstat) reports isDirectory:true.
  stats.set(skillPath, { isDirectory: true, isFile: false, mtimeMs: 100, size: 0 })
  stats.set(mdPath, { isDirectory: false, isFile: true, mtimeMs: 200, size: 40 })
  files.set(mdPath, '---\ndescription: "Turbo caching skill"\n---\n')

  const deps = baseDeps(fs)
  const result = buildSkillIndex(deps)
  expect(result.rows).toBe(1)

  const idx = loadIndex(result.path, deps)
  expect(idx).toEqual([{ name: "turbo-cache", desc: "turbo caching skill" }])

  // Assertion 2: the nested file is never touched — no call in the log references it.
  expect(calls.some((c) => c.path === nestedPath || c.path.startsWith(`${skillPath}/sub`))).toBe(false)
})

// AC-6: buildAgentIndex prunes node_modules and dot-dirs BEFORE recursion.
test("buildAgentIndex: prunes node_modules and dot-dirs before recursion (AC-6)", () => {
  const { fs, dirs, stats, files, calls } = makeFakeFs()
  const agentsDir = "/home/u/.claude/agents"
  const realAgentPath = `${agentsDir}/real-agent.md`

  // node_modules and .git entries are deliberately NOT registered in dirs/stats —
  // if buildAgentIndex ever calls readdirSync/statSync on them, the fake fs throws,
  // failing this test loudly instead of silently tolerating the leak.
  dirs.set(agentsDir, ["node_modules", ".git", "real-agent.md"])
  stats.set(realAgentPath, { isDirectory: false, isFile: true, mtimeMs: 1, size: 30 })
  files.set(realAgentPath, '---\ndescription: "Real agent for real work"\n---\n')

  const deps = baseDeps(fs)
  const result = buildAgentIndex(deps)
  expect(result.rows).toBe(1)

  const idx = loadIndex(result.path, deps)
  expect(idx).toEqual([{ name: "real-agent", desc: "real agent for real work" }])

  expect(calls.some((c) => c.path.includes("node_modules") || c.path.includes(".git"))).toBe(false)
})

// AC-14: loadIndex skips malformed lines without throwing.
test("loadIndex: skips malformed lines without throwing (AC-14)", () => {
  const { fs, files } = makeFakeFs()
  const idxPath = "/home/u/.claude/.router-cache/skills-index.tsv"
  files.set(
    idxPath,
    ["a\tdesc-a", "malformed-no-tab-here", "b\tdesc-b", "   \tdesc-whitespace-name"].join("\n") + "\n"
  )
  const deps = baseDeps(fs)
  const rows = loadIndex(idxPath, deps)
  expect(rows).toEqual([
    { name: "a", desc: "desc-a" },
    { name: "b", desc: "desc-b" },
  ])
})

// AC-6: needsRebuild mtime + empty-index boundary matrix.
test("needsRebuild: mtime + empty-index boundary matrix (AC-6)", () => {
  const skillsDir = "/home/u/.claude/skills"
  const idxPath = "/home/u/.claude/.router-cache/skills-index.tsv"
  const skillPath = `${skillsDir}/s1`
  const mdPath = `${skillPath}/SKILL.md`

  // Case 1: index mtime newer than every SKILL.md -> false.
  {
    const { fs, dirs, stats, files } = makeFakeFs()
    dirs.set(skillsDir, ["s1"])
    dirs.set(skillPath, ["SKILL.md"])
    stats.set(skillPath, { isDirectory: true, isFile: false, mtimeMs: 100, size: 0 })
    stats.set(mdPath, { isDirectory: false, isFile: true, mtimeMs: 500, size: 5 })
    stats.set(idxPath, { isDirectory: false, isFile: true, mtimeMs: 1000, size: 10 })
    // A file that stat()s as existing must also HAVE content. Without these the fixture
    // modelled an impossible world (existing-but-unreadable files), and the case passed for
    // the wrong reason: computeSkillRows() bailed on the ENOENT from readFileSync and
    // counted 0 rows, which happened to equal the 0 rows read from the contentless index.
    files.set(mdPath, "---\nname: s1\ndescription: does s1\n---\n")
    files.set(idxPath, "s1\tdoes s1\n")
    expect(needsRebuild(skillsDir, idxPath, baseDeps(fs))).toBe(false)
  }

  // Case 2: a SKILL.md mtime newer than the index -> true.
  {
    const { fs, dirs, stats } = makeFakeFs()
    dirs.set(skillsDir, ["s1"])
    dirs.set(skillPath, ["SKILL.md"])
    stats.set(skillPath, { isDirectory: true, isFile: false, mtimeMs: 100, size: 0 })
    stats.set(mdPath, { isDirectory: false, isFile: true, mtimeMs: 2000, size: 5 })
    stats.set(idxPath, { isDirectory: false, isFile: true, mtimeMs: 1000, size: 10 })
    expect(needsRebuild(skillsDir, idxPath, baseDeps(fs))).toBe(true)
  }

  // Case 3: existing but 0-byte index -> true regardless of mtimes.
  {
    const { fs, dirs, stats } = makeFakeFs()
    dirs.set(skillsDir, ["s1"])
    dirs.set(skillPath, ["SKILL.md"])
    stats.set(skillPath, { isDirectory: true, isFile: false, mtimeMs: 100, size: 0 })
    stats.set(mdPath, { isDirectory: false, isFile: true, mtimeMs: 1, size: 5 })
    stats.set(idxPath, { isDirectory: false, isFile: true, mtimeMs: 99999, size: 0 })
    expect(needsRebuild(skillsDir, idxPath, baseDeps(fs))).toBe(true)
  }
})

// AC-6: ensureIndex reports empty:true when the skills dir is absent or has zero valid entries.
test("ensureIndex: empty when skills dir absent or has zero valid entries (AC-6)", () => {
  // Case A: skills dir does not exist at all (nothing registered).
  {
    const { fs } = makeFakeFs()
    const result = ensureIndex(baseDeps(fs))
    expect(result.empty).toBe(true)
    expect(result.skills).toBe(0)
  }

  // Case B: skills dir exists but its only entry is a dangling symlink (statSync throws).
  {
    const { fs, dirs, stats } = makeFakeFs()
    const skillsDir = "/home/u/.claude/skills"
    dirs.set(skillsDir, ["dead-skill"])
    stats.set(skillsDir, { isDirectory: true, isFile: false, mtimeMs: 1, size: 0 })
    // "dead-skill" entry itself has NO registered stats -> statSync throws -> skipped, not crashed.
    const result = ensureIndex(baseDeps(fs))
    expect(result.empty).toBe(true)
    expect(result.skills).toBe(0)
  }
})

// Suggestion (QA iteration 2): `empty` only ever reflected the SKILLS index — an installed
// AGENTS dir with zero valid entries degraded `[AGENTS]` suggestions to permanent silence
// with no flag at all to detect it by. `agentsEmpty` makes that state independently
// inspectable, mirroring `empty`'s skills-side semantics.
test("ensureIndex: agentsEmpty is independent of (and does not require) the skills-side empty flag (suggestion)", () => {
  const skillsDir = "/home/u/.claude/skills"
  const skillPath = `${skillsDir}/turbo-cache`
  const mdPath = `${skillPath}/SKILL.md`

  // Skills present and non-empty, agents dir absent entirely -> empty:false, agentsEmpty:true.
  {
    const { fs, dirs, stats, files } = makeFakeFs()
    dirs.set(skillsDir, ["turbo-cache"])
    stats.set(skillsDir, { isDirectory: true, isFile: false, mtimeMs: 1, size: 0 })
    stats.set(skillPath, { isDirectory: true, isFile: false, mtimeMs: 100, size: 0 })
    stats.set(mdPath, { isDirectory: false, isFile: true, mtimeMs: 200, size: 40 })
    files.set(mdPath, '---\ndescription: "Turbo caching skill"\n---\n')

    const result = ensureIndex(baseDeps(fs)) as { empty: boolean; agentsEmpty: boolean; agents: number }
    expect(result.empty).toBe(false)
    expect(result.agentsEmpty).toBe(true)
    expect(result.agents).toBe(0)
  }

  // Skills present, agents ALSO present and non-empty -> both false.
  {
    const { fs, dirs, stats, files } = makeFakeFs()
    dirs.set(skillsDir, ["turbo-cache"])
    stats.set(skillsDir, { isDirectory: true, isFile: false, mtimeMs: 1, size: 0 })
    stats.set(skillPath, { isDirectory: true, isFile: false, mtimeMs: 100, size: 0 })
    stats.set(mdPath, { isDirectory: false, isFile: true, mtimeMs: 200, size: 40 })
    files.set(mdPath, '---\ndescription: "Turbo caching skill"\n---\n')

    const agentsDir = "/home/u/.claude/agents"
    const agentPath = `${agentsDir}/real-agent.md`
    dirs.set(agentsDir, ["real-agent.md"])
    stats.set(agentsDir, { isDirectory: true, isFile: false, mtimeMs: 1, size: 0 })
    stats.set(agentPath, { isDirectory: false, isFile: true, mtimeMs: 1, size: 30 })
    files.set(agentPath, '---\ndescription: "Real agent"\n---\n')

    const result = ensureIndex(baseDeps(fs)) as { empty: boolean; agentsEmpty: boolean; agents: number }
    expect(result.empty).toBe(false)
    expect(result.agentsEmpty).toBe(false)
    expect(result.agents).toBe(1)
  }
})

// Suggestion (QA iteration 2): `ensureDirSafe` used to swallow its own mkdir error, so the
// SUBSEQUENT unguarded `writeFileSync` exploded and the caller only ever saw THAT
// (misleading — usually a confusing ENOENT) error, hiding the REAL root cause (the mkdir
// EACCES/EROFS itself). Now the mkdir error is threaded into `writeError`/`indexError`
// directly.
test("buildSkillIndex/ensureIndex: a mkdir (router-cache dir) failure is reported as the REAL root cause, not a misleading downstream write error (suggestion)", () => {
  const skillsDir = "/home/u/.claude/skills"
  const skillPath = `${skillsDir}/turbo-cache`
  const mdPath = `${skillPath}/SKILL.md`

  const { fs, dirs, stats, files } = makeFakeFs()
  dirs.set(skillsDir, ["turbo-cache"])
  stats.set(skillsDir, { isDirectory: true, isFile: false, mtimeMs: 1, size: 0 })
  stats.set(skillPath, { isDirectory: true, isFile: false, mtimeMs: 100, size: 0 })
  stats.set(mdPath, { isDirectory: false, isFile: true, mtimeMs: 200, size: 40 })
  files.set(mdPath, '---\ndescription: "Turbo caching skill"\n---\n')

  const deps = baseDeps(fs)
  fs.mkdirSync = () => {
    throw new Error("EACCES: permission denied, mkdir '/home/u/.claude/.router-cache'");
  }

  const buildResult = buildSkillIndex(deps) as { writeError?: string | null }
  expect(buildResult.writeError).toBeTruthy()
  expect(String(buildResult.writeError)).toContain("EACCES");
  // Must be the REAL mkdir error, not a generic downstream ENOENT from writeFileSync
  // targeting a directory that was never created.
  expect(String(buildResult.writeError)).not.toContain("ENOENT");

  const ensureResult = ensureIndex(deps) as { indexError?: string | null }
  expect(String(ensureResult.indexError)).toContain("EACCES")
})

// W6: multi-line YAML block-scalar `description: |` must be joined into the description,
// not collapsed to the literal "|". Reproduced against the real installed
// `~/.claude/skills/academic-researcher/SKILL.md`, which uses exactly this style — the
// bash `awk` extractor has the same limitation (not a regression), but this port sits in
// the exact code path this whole change exists to harden.
test("buildSkillIndex: joins a multi-line YAML block-scalar description (W6)", () => {
  const { fs, dirs, stats, files } = makeFakeFs()
  const skillsDir = "/home/u/.claude/skills"
  const skillPath = `${skillsDir}/academic-researcher`
  const mdPath = `${skillPath}/SKILL.md`

  dirs.set(skillsDir, ["academic-researcher"])
  stats.set(skillPath, { isDirectory: true, isFile: false, mtimeMs: 100, size: 0 })
  stats.set(mdPath, { isDirectory: false, isFile: true, mtimeMs: 200, size: 400 })
  files.set(
    mdPath,
    [
      "---",
      "name: academic-researcher",
      "description: |",
      "  Academic research assistant for literature reviews, paper analysis, and scholarly writing.",
      "  Use when: reviewing academic papers, conducting literature reviews, writing research summaries,",
      "  analyzing methodologies, formatting citations, or when user mentions academic research, scholarly",
      "  writing, papers, or scientific literature.",
      "license: MIT",
      "---",
      "",
      "# Academic Researcher",
      "",
    ].join("\n"),
  )

  const deps = baseDeps(fs)
  const result = buildSkillIndex(deps)
  const idx = loadIndex(result.path, deps)

  expect(idx.length).toBe(1)
  expect(idx[0].name).toBe("academic-researcher")
  // Pre-fix: extractDescription only reads the FIRST matching line, so the block-scalar
  // indicator itself ("|") becomes the entire "description" — a literal single pipe
  // character, silently killing routing for every skill using this common YAML style.
  expect(idx[0].desc).not.toBe("|")
  expect(idx[0].desc).toContain("academic research assistant")
  expect(idx[0].desc).toContain("scientific literature")
})

// K4(a): index writes must be ATOMIC (tmp file + rename), never a direct truncate+write —
// a reader (skill-gate-eval.mjs) that opens the index mid-write would otherwise observe a
// torn/partial file. Proven here by making `renameSync` fail: the FINAL index path must be
// left completely untouched (still holding its old content), never a half-written file.
test("buildSkillIndex: writes atomically (tmp + renameSync), never a direct truncate+write (K4a)", () => {
  const { fs, dirs, stats, files, calls } = makeFakeFs()
  const skillsDir = "/home/u/.claude/skills"
  const skillPath = `${skillsDir}/turbo-cache`
  const mdPath = `${skillPath}/SKILL.md`
  const idxPath = "/home/u/.claude/.router-cache/skills-index.tsv"

  dirs.set(skillsDir, ["turbo-cache"])
  stats.set(skillPath, { isDirectory: true, isFile: false, mtimeMs: 100, size: 0 })
  stats.set(mdPath, { isDirectory: false, isFile: true, mtimeMs: 200, size: 40 })
  files.set(mdPath, '---\ndescription: "Turbo caching skill"\n---\n')
  // Old content already present at the real index path (as if a previous run wrote it).
  files.set(idxPath, "old-skill\tstale entry from a previous run\n")

  const deps = baseDeps(fs)
  const realRename = fs.renameSync
  fs.renameSync = () => {
    throw new Error("EACCES: permission denied, rename")
  }

  buildSkillIndex(deps)

  // The final path must be UNCHANGED — a failed atomic rename must never leave a
  // half-written file at the real path readers actually open.
  expect(files.get(idxPath)).toBe("old-skill\tstale entry from a previous run\n")
  // Proves the write actually went through a SIBLING temp path first, then attempted a
  // rename onto the real path — not a direct truncate+write at idxPath. Combined with the
  // untouched-idxPath assertion above, this shows the write is genuinely atomic: content
  // lands at a `${idxPath}.<unique>.tmp` sibling (C2: unique per writer, not a bare
  // `${idxPath}.tmp`), and only a successful rename ever makes it visible at the real
  // path — never a direct write there.
  expect(calls.some((c) => c.op === "writeFileSync" && c.path !== idxPath && c.path.startsWith(idxPath))).toBe(true)
  expect(calls.some((c) => c.op === "writeFileSync" && c.path === idxPath)).toBe(false)
  fs.renameSync = realRename
})

// K3: a writeFileSync failure (EACCES/EROFS/ENOSPC) building the index must NOT propagate
// as an uncaught exception and must NOT silently vanish — `ensureIndex` surfaces it as a
// structured `indexError` so the caller (skill-router.mjs) can emit a loud warning instead
// of the exact silent-no-op this whole change exists to eradicate.
test("buildSkillIndex/ensureIndex: a writeFileSync failure is captured, not thrown or swallowed (K3)", () => {
  const { fs, dirs, stats, files } = makeFakeFs()
  const skillsDir = "/home/u/.claude/skills"
  const skillPath = `${skillsDir}/turbo-cache`
  const mdPath = `${skillPath}/SKILL.md`

  dirs.set(skillsDir, ["turbo-cache"])
  stats.set(skillsDir, { isDirectory: true, isFile: false, mtimeMs: 1, size: 0 })
  stats.set(skillPath, { isDirectory: true, isFile: false, mtimeMs: 100, size: 0 })
  stats.set(mdPath, { isDirectory: false, isFile: true, mtimeMs: 200, size: 40 })
  files.set(mdPath, '---\ndescription: "Turbo caching skill"\n---\n')

  const deps = baseDeps(fs)
  fs.writeFileSync = () => {
    throw new Error("EACCES: permission denied, open")
  }

  let buildResult: { rows: number; path: string; writeError?: string | null } | undefined
  expect(() => {
    buildResult = buildSkillIndex(deps)
  }).not.toThrow()
  expect(buildResult?.writeError).toBeTruthy()

  const ensureResult = ensureIndex(deps) as { indexError?: string | null }
  expect(ensureResult.indexError).toBeTruthy()
  expect(String(ensureResult.indexError)).toContain("EACCES")
})

// C2: atomicWriteIndex's tmp filename must NOT be shared across writers. Two hooks
// (skill-gate-eval.mjs + skill-router.mjs) are wired on the SAME UserPromptSubmit event
// and Claude Code runs matching hooks in PARALLEL as separate OS processes — both call
// ensureIndex, both would write the SAME `${idxPath}.tmp` pre-fix, so process B's write
// can truncate/rewrite the tmp file process A is about to rename onto the real path,
// publishing a TORN index atomically (renameSync itself is atomic; the shared tmp source
// is not). Simulated here as two sequential invocations against the same idxPath — proves
// each write picks a distinct tmp path, the actual guarantee that prevents the cross-process
// collision.
test("buildSkillIndex: uses a unique tmp path per write, never a shared `${idxPath}.tmp` (C2)", () => {
  const { fs, dirs, stats, files, calls } = makeFakeFs()
  const skillsDir = "/home/u/.claude/skills"
  const skillPath = `${skillsDir}/turbo-cache`
  const mdPath = `${skillPath}/SKILL.md`
  const idxPath = "/home/u/.claude/.router-cache/skills-index.tsv"

  dirs.set(skillsDir, ["turbo-cache"])
  stats.set(skillPath, { isDirectory: true, isFile: false, mtimeMs: 100, size: 0 })
  stats.set(mdPath, { isDirectory: false, isFile: true, mtimeMs: 200, size: 40 })
  files.set(mdPath, '---\ndescription: "Turbo caching skill"\n---\n')

  const deps = baseDeps(fs)
  buildSkillIndex(deps) // "process A"
  buildSkillIndex(deps) // "process B" — races against the same idxPath

  const tmpWrites = calls.filter((c) => c.op === "writeFileSync" && c.path !== idxPath && c.path.startsWith(idxPath))
  expect(tmpWrites.length).toBe(2)
  expect(tmpWrites[0].path).not.toBe(tmpWrites[1].path)
  // The bare, pre-fix shared name must never appear.
  expect(calls.some((c) => c.op === "writeFileSync" && c.path === `${idxPath}.tmp`)).toBe(false)
})

// C2: a failed atomic rename (EACCES) must not leave an orphaned tmp file behind —
// `atomicWriteIndex` must `rmSync` its own tmp on failure.
test("buildSkillIndex: removes the tmp file when renameSync fails, no orphaned tmp left behind (C2)", () => {
  const { fs, dirs, stats, files, calls } = makeFakeFs()
  const skillsDir = "/home/u/.claude/skills"
  const skillPath = `${skillsDir}/turbo-cache`
  const mdPath = `${skillPath}/SKILL.md`
  const idxPath = "/home/u/.claude/.router-cache/skills-index.tsv"

  dirs.set(skillsDir, ["turbo-cache"])
  stats.set(skillPath, { isDirectory: true, isFile: false, mtimeMs: 100, size: 0 })
  stats.set(mdPath, { isDirectory: false, isFile: true, mtimeMs: 200, size: 40 })
  files.set(mdPath, '---\ndescription: "Turbo caching skill"\n---\n')

  const deps = baseDeps(fs)
  fs.renameSync = () => {
    throw new Error("EACCES: permission denied, rename")
  }

  buildSkillIndex(deps)

  const tmpWrite = calls.find((c) => c.op === "writeFileSync" && c.path !== idxPath && c.path.startsWith(idxPath))
  expect(tmpWrite).toBeTruthy()
  expect(files.has((tmpWrite as { path: string }).path)).toBe(false)
  expect(calls.some((c) => c.op === "rmSync" && c.path === (tmpWrite as { path: string }).path)).toBe(true)
})

// W3: needsRebuild was blind to DELETIONS — uninstalling a skill never bumps any
// surviving SKILL.md's mtime, so a naive mtime-only comparison says "nothing to do" even
// though the on-disk index still has a stale row for the removed skill. `skill-gate-eval`
// would then put a no-longer-installed skill in `required`, `readSkillBody` returns ""
// silently, and the Stop gate blocks the turn demanding a Skill() call that cannot
// succeed. Fix: also compare the indexed row COUNT against the currently installed count.
test("needsRebuild: also true when the indexed row count no longer matches current entries — deletions bump no mtime (W3)", () => {
  const skillsDir = "/home/u/.claude/skills"
  const idxPath = "/home/u/.claude/.router-cache/skills-index.tsv"
  const skillPath = `${skillsDir}/s1`
  const mdPath = `${skillPath}/SKILL.md`

  const { fs, dirs, stats, files } = makeFakeFs()
  // Only ONE skill currently on disk...
  dirs.set(skillsDir, ["s1"])
  dirs.set(skillPath, ["SKILL.md"])
  stats.set(skillPath, { isDirectory: true, isFile: false, mtimeMs: 100, size: 0 })
  stats.set(mdPath, { isDirectory: false, isFile: true, mtimeMs: 200, size: 40 })
  files.set(mdPath, '---\ndescription: "still installed"\n---\n')
  // ...but the on-disk index still has TWO rows (one from a skill that was since
  // uninstalled) and its mtime is NEWER than the surviving SKILL.md — a deletion never
  // bumps anyone's mtime, so the mtime-only check alone would say "nothing to do".
  stats.set(idxPath, { isDirectory: false, isFile: true, mtimeMs: 9999, size: 40 })
  files.set(idxPath, "s1\tstill installed\nuninstalled-skill\tgone now\n")

  expect(needsRebuild(skillsDir, idxPath, baseDeps(fs))).toBe(true)
})
