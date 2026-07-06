#!/usr/bin/env bun
/**
 * Pack integrity gate (run in CI + locally via `bun run validate`).
 * Fails (exit 1) if the bundled skill/agent pack has:
 *   - a skills/<name>/ without a valid SKILL.md frontmatter
 *   - build junk committed (node_modules, .git, .venv, dist, …)
 *   - an agent .md whose frontmatter can't be converted to an opencode agent
 */
import { readdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import { isValidSkill } from "../src/installers/skills.ts"
import { toOpencodeAgent } from "../src/installers/agents.ts"
import { readText } from "../src/util.ts"

const ROOT = join(import.meta.dir, "..")
const SKILLS = join(ROOT, "skills")
const AGENTS = join(ROOT, "agents")
const JUNK = new Set(["node_modules", ".git", ".venv", "venv", "dist", "build", "__pycache__", ".pytest_cache"])

const errors: string[] = []
const warn = (m: string) => console.log(`  ! ${m}`)

function walkJunk(dir: string): string[] {
  const hits: string[] = []
  const visit = (d: string) => {
    let entries: import("node:fs").Dirent[]
    try {
      entries = readdirSync(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue
      if (JUNK.has(e.name)) hits.push(join(d, e.name))
      else visit(join(d, e.name))
    }
  }
  visit(dir)
  return hits
}

function allMarkdown(dir: string): string[] {
  const out: string[] = []
  const visit = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name)
      if (e.isDirectory()) visit(p)
      else if (e.name.endsWith(".md")) out.push(p)
    }
  }
  if (existsSync(dir)) visit(dir)
  return out
}

// ── skills ───────────────────────────────────────────────────────
let skillTotal = 0
let skillInvalid = 0
if (existsSync(SKILLS)) {
  for (const e of readdirSync(SKILLS, { withFileTypes: true })) {
    if (!e.isDirectory()) continue
    skillTotal++
    if (!isValidSkill(join(SKILLS, e.name))) {
      skillInvalid++
      errors.push(`invalid skill (bad/missing SKILL.md frontmatter): skills/${e.name}`)
    }
  }
}
console.log(`skills: ${skillTotal} total, ${skillTotal - skillInvalid} valid, ${skillInvalid} invalid`)

// ── agents ───────────────────────────────────────────────────────
const agentFiles = allMarkdown(AGENTS)
let agentBad = 0
for (const f of agentFiles) {
  try {
    if (!toOpencodeAgent(readText(f), "x")) {
      agentBad++
      errors.push(`unconvertible agent: ${f.replace(ROOT + "/", "")}`)
    }
  } catch {
    agentBad++
    errors.push(`unreadable agent: ${f.replace(ROOT + "/", "")}`)
  }
}
console.log(`agents: ${agentFiles.length} total, ${agentFiles.length - agentBad} convertible, ${agentBad} bad`)

// ── junk ─────────────────────────────────────────────────────────
const junk = [...walkJunk(SKILLS), ...walkJunk(AGENTS)]
for (const j of junk) errors.push(`committed junk dir: ${j.replace(ROOT + "/", "")}`)
console.log(`junk dirs: ${junk.length}`)

// ── verdict ──────────────────────────────────────────────────────
console.log("")
if (errors.length === 0) {
  console.log("✓ pack is clean")
  process.exit(0)
}
console.log(`✗ ${errors.length} problem(s):`)
for (const e of errors.slice(0, 40)) warn(e)
if (errors.length > 40) warn(`… and ${errors.length - 40} more`)
process.exit(1)
