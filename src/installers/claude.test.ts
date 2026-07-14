import { test, expect } from "bun:test"
import { planClaudeHooks, mergeClaudeSettingsHooks } from "./claude.ts"

const cmds = {
  gateEval: 'node "/home/u/.claude/hooks/skill-gate-eval.mjs"',
  gateTrack: 'node "/home/u/.claude/hooks/skill-gate-track.mjs"',
  gateStop: 'node "/home/u/.claude/hooks/skill-gate-stop.mjs"',
  skillRouter: 'node "/home/u/.claude/hooks/skill-router.mjs"',
  usageTracker: 'node "/home/u/.claude/hooks/skill-usage-tracker.mjs"',
}

test("planClaudeHooks: fresh input wires gate-eval then skill-router, both PostToolUse matchers, Stop (AC-12)", () => {
  const plan = planClaudeHooks({}, cmds)

  expect(plan.UserPromptSubmit).toEqual([
    { hooks: [{ type: "command", command: cmds.gateEval }] },
    { hooks: [{ type: "command", command: cmds.skillRouter }] },
  ])
  expect(plan.PostToolUse).toEqual([
    { matcher: "Skill", hooks: [{ type: "command", command: cmds.gateTrack }] },
    { matcher: "*", hooks: [{ type: "command", command: cmds.usageTracker }] },
  ])
  expect(plan.Stop).toEqual([{ hooks: [{ type: "command", command: cmds.gateStop }] }])
})

test("planClaudeHooks: already-wired input is idempotent — re-running adds no duplicates (AC-12)", () => {
  const already = planClaudeHooks({}, cmds)
  const plan = planClaudeHooks(already, cmds)

  expect(plan.UserPromptSubmit).toEqual(already.UserPromptSubmit)
  expect(plan.PostToolUse).toEqual(already.PostToolUse)
  expect(plan.Stop).toEqual(already.Stop)
  expect(plan.UserPromptSubmit.length).toBe(2)
  expect(plan.PostToolUse.length).toBe(2)
  expect(plan.Stop.length).toBe(1)
})

test("planClaudeHooks: legacy .sh wiring is stripped, not merely appended-around (AC-12)", () => {
  const legacyHooks = {
    UserPromptSubmit: [
      { hooks: [{ type: "command", command: "bash ~/.claude/hooks/skill-router.sh" }] },
      { hooks: [{ type: "command", command: "bash ~/.claude/hooks/skill-forced-eval.sh" }] },
    ],
    PostToolUse: [{ matcher: "*", hooks: [{ type: "command", command: "bash ~/.claude/hooks/usage-tracker.sh" }] }],
    Stop: [],
  }

  const plan = planClaudeHooks(legacyHooks, cmds)

  const upsJson = JSON.stringify(plan.UserPromptSubmit)
  expect(upsJson).not.toContain("skill-router.sh")
  expect(upsJson).not.toContain("skill-forced-eval")
  const ptuJson = JSON.stringify(plan.PostToolUse)
  expect(ptuJson).not.toContain("usage-tracker.sh")

  // The new wiring is present in the right order/shape after the strip.
  expect(plan.UserPromptSubmit).toEqual([
    { hooks: [{ type: "command", command: cmds.gateEval }] },
    { hooks: [{ type: "command", command: cmds.skillRouter }] },
  ])
  expect(plan.PostToolUse).toEqual([
    { matcher: "Skill", hooks: [{ type: "command", command: cmds.gateTrack }] },
    { matcher: "*", hooks: [{ type: "command", command: cmds.usageTracker }] },
  ])
})

test("planClaudeHooks: preserves unrelated third-party hook entries untouched (no data loss)", () => {
  const withThirdParty = {
    UserPromptSubmit: [{ hooks: [{ type: "command", command: "node some-other-plugin.mjs" }] }],
    PostToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "node audit-log.mjs" }] }],
    Stop: [{ hooks: [{ type: "command", command: "node cleanup.mjs" }] }],
  }

  const plan = planClaudeHooks(withThirdParty, cmds)

  expect(JSON.stringify(plan.UserPromptSubmit)).toContain("some-other-plugin.mjs")
  expect(JSON.stringify(plan.PostToolUse)).toContain("audit-log.mjs")
  expect(JSON.stringify(plan.Stop)).toContain("cleanup.mjs")
})

// W5: `strip(arr, needle)` used to match ANY hook entry whose JSON merely CONTAINS the bare
// substring "skill-router"/"usage-tracker" — a user's own `my-skill-router-lint.sh`, or any
// `usage-tracker`-named hook from a totally different plugin, was silently deleted on EVERY
// install with no mention in the returned actions. A `.bak` of settings.json does not make
// undisclosed deletion of config we did not create acceptable.
test("planClaudeHooks: a third-party hook that merely CONTAINS a legacy substring is never stripped (W5)", () => {
  const collidingThirdParty = {
    UserPromptSubmit: [{ hooks: [{ type: "command", command: "bash ~/.config/my-skill-router-lint.sh" }] }],
    PostToolUse: [{ matcher: "*", hooks: [{ type: "command", command: "node ~/.config/usage-tracker-audit.mjs" }] }],
    Stop: [],
  }

  const plan = planClaudeHooks(collidingThirdParty, cmds)

  expect(JSON.stringify(plan.UserPromptSubmit)).toContain("my-skill-router-lint.sh")
  expect(JSON.stringify(plan.PostToolUse)).toContain("usage-tracker-audit.mjs")
})

// W5: legacy `.sh` entries (a machine's prior bash-hook install) and our OWN prior-run
// `.mjs` entries (idempotent re-install) must still be stripped and REPORTED — deletion of
// config we DID create/own is fine, but it must never be silent either.
test("planClaudeHooks: reports every entry it actually strips (legacy .sh + our own re-install) (W5)", () => {
  const legacyAndOwn = {
    UserPromptSubmit: [
      { hooks: [{ type: "command", command: "bash ~/.claude/hooks/skill-router.sh" }] },
      { hooks: [{ type: "command", command: cmds.skillRouter }] }, // our own, from a prior run
    ],
    PostToolUse: [{ matcher: "*", hooks: [{ type: "command", command: "bash ~/.claude/hooks/usage-tracker.sh" }] }],
    Stop: [],
  }

  const plan = planClaudeHooks(legacyAndOwn, cmds)

  expect(plan.strippedEntries.length).toBe(3)
  const strippedJsons = plan.strippedEntries.map((e) => JSON.stringify(e))
  expect(strippedJsons.some((j) => j.includes("skill-router.sh"))).toBe(true)
  expect(strippedJsons.some((j) => j.includes("usage-tracker.sh"))).toBe(true)
  expect(strippedJsons.some((j) => j === JSON.stringify({ hooks: [{ type: "command", command: cmds.skillRouter }] }))).toBe(true)
})

// K1: `installClaude` used to do `settings.hooks = plan` — a wholesale REPLACE, not a
// merge. `planClaudeHooks` only ever returns `{UserPromptSubmit, PostToolUse, Stop}`, so
// assigning its result over the WHOLE `hooks` object silently DELETES any other event the
// user (or a third-party plugin) had wired — `PreToolUse`, `SessionStart`, `PreCompact`,
// `SubagentStop`, `Notification`, `SessionEnd`. This is a regression versus the
// pre-change code, which mutated the existing hooks object in place. `mergeClaudeSettingsHooks`
// is the pure merge step `installClaude` must use instead of a bare assignment.
test("mergeClaudeSettingsHooks: preserves unrelated hook EVENTS (PreToolUse, SessionStart, ...) untouched (K1)", () => {
  const existingHooks = {
    PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "node audit-log.mjs" }] }],
    SessionStart: [{ hooks: [{ type: "command", command: "node session-start.mjs" }] }],
    PreCompact: [{ hooks: [{ type: "command", command: "node pre-compact.mjs" }] }],
    SubagentStop: [{ hooks: [{ type: "command", command: "node subagent-stop.mjs" }] }],
    Notification: [{ hooks: [{ type: "command", command: "node notify.mjs" }] }],
    SessionEnd: [{ hooks: [{ type: "command", command: "node session-end.mjs" }] }],
  }
  const plan = planClaudeHooks(existingHooks, cmds)

  const merged = mergeClaudeSettingsHooks(existingHooks, plan)

  // Every event `planClaudeHooks` doesn't know about must survive byte-for-byte.
  expect(merged.PreToolUse).toEqual(existingHooks.PreToolUse)
  expect(merged.SessionStart).toEqual(existingHooks.SessionStart)
  expect(merged.PreCompact).toEqual(existingHooks.PreCompact)
  expect(merged.SubagentStop).toEqual(existingHooks.SubagentStop)
  expect(merged.Notification).toEqual(existingHooks.Notification)
  expect(merged.SessionEnd).toEqual(existingHooks.SessionEnd)
  // And the events the plan DOES own are the freshly computed ones, not stale leftovers.
  expect(merged.UserPromptSubmit).toEqual(plan.UserPromptSubmit)
  expect(merged.PostToolUse).toEqual(plan.PostToolUse)
  expect(merged.Stop).toEqual(plan.Stop)
})

// W5: `plan.strippedEntries` (the new reporting-only field) must NEVER leak into the merged
// `settings.hooks` object that actually gets written to disk — it's a report for the
// installer's Action log, not a real hook-wiring event.
test("mergeClaudeSettingsHooks: never writes plan.strippedEntries into settings.json's hooks object (W5)", () => {
  const plan = planClaudeHooks({}, cmds)
  const merged = mergeClaudeSettingsHooks({}, plan)
  expect("strippedEntries" in merged).toBe(false)
})
