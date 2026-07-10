import { test, expect } from "bun:test"
import { upsertMindset } from "./installers/mindset.ts"
import { MINDSET_MD, MINDSET_START, MINDSET_END } from "./mindset-template.ts"

const BLOCK = MINDSET_MD.trimEnd()

test("file absent → create with the block", () => {
  const res = upsertMindset(null)
  expect(res.kind).toBe("create")
  if (res.kind === "create") {
    expect(res.next).toContain(MINDSET_START)
    expect(res.next).toContain(MINDSET_END)
  }
})

test("plain file → append, preserving existing content", () => {
  const existing = "# My rules\n\nDo things well.\n"
  const res = upsertMindset(existing)
  expect(res.kind).toBe("append")
  if (res.kind === "append") {
    expect(res.next.startsWith(existing)).toBe(true)
    expect(res.next).toContain(MINDSET_START)
  }
})

test("current block already present → noop", () => {
  const existing = "# Rules\n\n" + BLOCK + "\n\n# More rules\n"
  expect(upsertMindset(existing).kind).toBe("noop")
})

test("stale block → replace in place, surrounding content survives", () => {
  const stale = `${MINDSET_START}\nold v0 content\n${MINDSET_END}`
  const existing = `# Before\n\n${stale}\n\n# After\n`
  const res = upsertMindset(existing)
  expect(res.kind).toBe("replace")
  if (res.kind === "replace") {
    expect(res.next).toContain("# Before")
    expect(res.next).toContain("# After")
    expect(res.next).not.toContain("old v0 content")
    expect(res.next).toContain("Engineering Mindset Protocol")
  }
})

test("hand-rolled custom section without markers → skip, never duplicate", () => {
  const existing = "# Persona\n\n### CÓMO PIENSA FABLE (el protocolo)\n1. Evidencia...\n"
  expect(upsertMindset(existing).kind).toBe("skip-custom")
})

test("english custom section without markers → skip", () => {
  const existing = "# Engineering Mindset Protocol (hand-maintained)\n...\n"
  expect(upsertMindset(existing).kind).toBe("skip-custom")
})

test("template carries injection-resistance and teaching sections", () => {
  expect(MINDSET_MD).toContain("Prompt-injection resistance")
  expect(MINDSET_MD).toContain("Teaching posture")
  expect(MINDSET_MD).toContain("Mandatory disagreement")
})
