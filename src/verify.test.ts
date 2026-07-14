import { test, expect } from "bun:test"
import { routerWiringCheck, indexHealthCheck } from "./verify.ts"

// T046/design Observability section: routerWiringCheck is pure — ok:true only when BOTH
// the new hooks (skill-router in UserPromptSubmit, skill-usage-tracker in PostToolUse)
// are present. Mirrors the existing inline evalWired/stopWired pattern in verify().
test("routerWiringCheck: ok only when both new hooks are wired", () => {
  expect(routerWiringCheck({}).ok).toBe(false)

  expect(
    routerWiringCheck({
      UserPromptSubmit: [{ hooks: [{ type: "command", command: 'node "skill-router.mjs"' }] }],
      PostToolUse: [],
    }).ok,
  ).toBe(false)

  expect(
    routerWiringCheck({
      UserPromptSubmit: [],
      PostToolUse: [{ matcher: "*", hooks: [{ type: "command", command: 'node "skill-usage-tracker.mjs"' }] }],
    }).ok,
  ).toBe(false)

  expect(
    routerWiringCheck({
      UserPromptSubmit: [{ hooks: [{ type: "command", command: 'node "skill-router.mjs"' }] }],
      PostToolUse: [{ matcher: "*", hooks: [{ type: "command", command: 'node "skill-usage-tracker.mjs"' }] }],
    }).ok,
  ).toBe(true)
})

// T046/AC-6 (visibility half): a 0-row index is the exact silent-no-op bug this whole
// change exists to fix — indexHealthCheck must report ok:false, never silently ok:true.
test("indexHealthCheck: ok:false on a 0-row index (silent-no-op becomes visible)", () => {
  const okFs = {
    existsSync: (p: string) => p === "/idx.tsv",
    readFileSync: (_p: string, _enc: string) => "turbo-cache\tcache invalidation layer\n",
    statSync: (_p: string) => ({ mtimeMs: 1000 }),
  }
  const good = indexHealthCheck("/idx.tsv", okFs, () => 5000)
  expect(good.ok).toBe(true)
  expect(good.rows).toBe(1)
  expect(good.ageMs).toBe(4000)

  const emptyFs = {
    existsSync: (p: string) => p === "/idx.tsv",
    readFileSync: (_p: string, _enc: string) => "",
    statSync: (_p: string) => ({ mtimeMs: 1000 }),
  }
  const empty = indexHealthCheck("/idx.tsv", emptyFs, () => 5000)
  expect(empty.ok).toBe(false)
  expect(empty.rows).toBe(0)

  const missingFs = {
    existsSync: (_p: string) => false,
    readFileSync: (_p: string, _enc: string) => "",
    statSync: (_p: string) => ({ mtimeMs: 0 }),
  }
  const missing = indexHealthCheck("/idx.tsv", missingFs, () => 5000)
  expect(missing.ok).toBe(false)
  expect(missing.rows).toBe(0)
})
