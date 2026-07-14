import { test, expect } from "bun:test"
import { planClaudeTokens, planOpencodeTokens, CAPABILITY_KILLERS } from "./tokens.ts"

// ---------------------------------------------------------------------------
// Design contract: these settings cut token cost WITHOUT cutting capability.
// The popular "cost-saving config" floating around the web disables bundled
// skills, forces effortLevel=low and MAX_THINKING_TOKENS=0. That trades away the
// thing you pay for. This installer must never write those keys.
// ---------------------------------------------------------------------------

test("never writes capability-killing keys into Claude settings", () => {
  const plan = planClaudeTokens({})
  const written = JSON.stringify(plan.next)
  for (const killer of CAPABILITY_KILLERS) {
    expect(written).not.toContain(killer)
  }
})

test("fresh Claude config: sets the verified safe knobs", () => {
  const { next, changed } = planClaudeTokens({})
  expect(next.env.BASH_MAX_OUTPUT_LENGTH).toBe("20000")
  expect(next.env.MAX_MCP_OUTPUT_TOKENS).toBe("10000")
  expect(next.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC).toBe("1")
  expect(next.autoCompactEnabled).toBe(true)
  expect(next.cleanupPeriodDays).toBe(20)
  expect(changed).toBe(true)
})

// Idempotence is what makes the installer safe to re-run on every machine.
test("re-running on an already-optimized Claude config changes nothing", () => {
  const first = planClaudeTokens({}).next
  const second = planClaudeTokens(first)
  expect(second.changed).toBe(false)
})

// The user's own choices outrank ours. We fill gaps; we do not overwrite.
test("existing user env values are preserved, never overwritten", () => {
  const { next } = planClaudeTokens({ env: { BASH_MAX_OUTPUT_LENGTH: "99999", FOO: "bar" } })
  expect(next.env.BASH_MAX_OUTPUT_LENGTH).toBe("99999")
  expect(next.env.FOO).toBe("bar")
  expect(next.env.MAX_MCP_OUTPUT_TOKENS).toBe("10000")
})

test("an explicit autoCompactEnabled=false is respected, not flipped back", () => {
  const { next } = planClaudeTokens({ autoCompactEnabled: false })
  expect(next.autoCompactEnabled).toBe(false)
})

test("unrelated Claude settings survive untouched", () => {
  const { next } = planClaudeTokens({ model: "opus[1m]", hooks: { UserPromptSubmit: ["x"] } })
  expect(next.model).toBe("opus[1m]")
  expect(next.hooks).toEqual({ UserPromptSubmit: ["x"] })
})

// ---------------------------------------------------------------------------
// opencode
// ---------------------------------------------------------------------------

test("fresh opencode config: enables compaction and pruning", () => {
  const { next, changed } = planOpencodeTokens({})
  expect(next.compaction.auto).toBe(true)
  expect(next.compaction.prune).toBe(true)
  expect(changed).toBe(true)
})

test("re-running on an already-optimized opencode config changes nothing", () => {
  const first = planOpencodeTokens({}).next
  expect(planOpencodeTokens(first).changed).toBe(false)
})

test("opencode: existing plugins and permissions survive untouched", () => {
  const cfg = { plugin: ["./plugins/caveman/plugin.js"], permission: { skill: { "*": "allow" } } }
  const { next } = planOpencodeTokens(cfg)
  expect(next.plugin).toEqual(["./plugins/caveman/plugin.js"])
  expect(next.permission).toEqual({ skill: { "*": "allow" } })
})

test("opencode: an explicit compaction.prune=false is respected", () => {
  const { next } = planOpencodeTokens({ compaction: { prune: false } })
  expect(next.compaction.prune).toBe(false)
})
