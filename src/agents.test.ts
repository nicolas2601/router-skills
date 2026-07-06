import { test, expect } from "bun:test"
import { toOpencodeAgent, parseFrontmatter } from "./installers/agents.ts"

test("parseFrontmatter: simple key/value", () => {
  const { fm, body } = parseFrontmatter("---\nname: foo\ndescription: bar\n---\nhello")
  expect(fm.name).toBe("foo")
  expect(fm.description).toBe("bar")
  expect(body.trim()).toBe("hello")
})

test("parseFrontmatter: CRLF line endings", () => {
  const { fm } = parseFrontmatter("---\r\nname: foo\r\ndescription: bar\r\n---\r\nbody")
  expect(fm.name).toBe("foo")
  expect(fm.description).toBe("bar")
})

test("parseFrontmatter: YAML block scalar description", () => {
  const { fm } = parseFrontmatter("---\nname: seo\ndescription: >\n  line one\n  line two\n---\nx")
  expect(fm.description).toBe("line one line two")
})

test("toOpencodeAgent: emits mode:subagent + description, drops tools string", () => {
  const src = "---\nname: Frontend Dev\ndescription: Builds UIs\ntools: Read, Write, Edit\ncolor: cyan\n---\nDo the thing."
  const out = toOpencodeAgent(src, "frontend-dev")!
  expect(out).toContain("mode: subagent")
  expect(out).toContain('description: "Builds UIs"')
  expect(out).not.toContain("tools: Read")
  expect(out).not.toContain("color:")
  expect(out.trimEnd().endsWith("Do the thing.")).toBe(true)
})

test("toOpencodeAgent: escapes quotes in description", () => {
  const out = toOpencodeAgent('---\ndescription: He said "hi"\n---\nbody', "x")!
  expect(out).toContain('description: "He said \\"hi\\""')
})

test("toOpencodeAgent: falls back to name then slug when no description", () => {
  expect(toOpencodeAgent("---\nname: OnlyName\n---\nb", "slug")).toContain('description: "OnlyName"')
  expect(toOpencodeAgent("---\nfoo: bar\n---\nb", "the-slug")).toContain('description: "the-slug"')
})

test("toOpencodeAgent: keeps a numeric temperature, ignores garbage", () => {
  expect(toOpencodeAgent("---\ndescription: d\ntemperature: 0.7\n---\nb", "x")).toContain("temperature: 0.7")
  expect(toOpencodeAgent("---\ndescription: d\ntemperature: hot\n---\nb", "x")).not.toContain("temperature:")
})

test("toOpencodeAgent: no frontmatter → null", () => {
  expect(toOpencodeAgent("just a body, no frontmatter", "x")).toContain('description: "x"')
  expect(toOpencodeAgent("", "x")).toBeNull()
})
