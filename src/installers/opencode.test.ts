import { test, expect } from "bun:test"
import { planOpencodeConfig, RULE_REF } from "./opencode.ts"

const allow = { "*": "allow" }

test("fresh config: needs everything", () => {
  const p = planOpencodeConfig({})
  expect(p).toEqual({ hasRule: false, needSkill: true, needTask: true, fullyConfigured: false })
})

// The regression. permissions present, rule absent: the old check read `!hasRule`, so it
// reported "already set (skipped)" and never wrote instructions[]. It must NOT be
// considered fully configured — the rule is exactly what is missing.
test("permissions set but rule missing: not fully configured", () => {
  const p = planOpencodeConfig({ permission: { skill: allow, task: allow } })
  expect(p.hasRule).toBe(false)
  expect(p.needSkill).toBe(false)
  expect(p.needTask).toBe(false)
  expect(p.fullyConfigured).toBe(false)
})

test("rule registered and permissions set: fully configured", () => {
  const p = planOpencodeConfig({ instructions: [RULE_REF], permission: { skill: allow, task: allow } })
  expect(p.fullyConfigured).toBe(true)
})

test("rule registered but a permission missing: not fully configured", () => {
  const p = planOpencodeConfig({ instructions: [RULE_REF], permission: { skill: allow } })
  expect(p.needTask).toBe(true)
  expect(p.fullyConfigured).toBe(false)
})

test("rule alongside other instructions is detected", () => {
  const p = planOpencodeConfig({ instructions: ["other.md", RULE_REF], permission: { skill: allow, task: allow } })
  expect(p.hasRule).toBe(true)
  expect(p.fullyConfigured).toBe(true)
})

// An explicit task["*"] the user set (even a deny) is theirs to keep — never overridden.
test("explicit task deny is respected, not treated as missing", () => {
  const p = planOpencodeConfig({ permission: { skill: allow, task: { "*": "deny" } } })
  expect(p.needTask).toBe(false)
})

test("per-glob task rules without a '*' default still need the default filled", () => {
  const p = planOpencodeConfig({ permission: { skill: allow, task: { "build*": "allow" } } })
  expect(p.needTask).toBe(true)
})

test("skill set to something other than allow still needs fixing", () => {
  const p = planOpencodeConfig({ permission: { skill: { "*": "ask" }, task: allow } })
  expect(p.needSkill).toBe(true)
})
