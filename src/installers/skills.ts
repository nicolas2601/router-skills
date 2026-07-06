import { readdirSync, existsSync, symlinkSync, lstatSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { HOME, SKILLS, ensureDir, type Action } from "../util.ts"
import { claudeSkillsDir } from "../paths.ts"

/**
 * A skill is linkable only if its SKILL.md opens with a `---` frontmatter block that
 * declares a `name:`. Skipping malformed skills keeps both harnesses from logging parse
 * errors at startup (e.g. a SKILL.md with no frontmatter).
 */
export function isValidSkill(dir: string): boolean {
  const md = join(dir, "SKILL.md")
  if (!existsSync(md)) return false
  try {
    const head = readFileSync(md, "utf8").slice(0, 4096)
    if (!/^﻿?---\r?\n/.test(head)) return false
    const fm = /^﻿?---\r?\n([\s\S]*?)\r?\n---/.exec(head)
    return !!fm && /^name:\s*\S/m.test(fm[1])
  } catch {
    return false
  }
}

/**
 * Link bundled skills into the global Claude skills dir.
 * opencode discovers ~/.claude/skills globally too, so this covers BOTH harnesses
 * with a single source of truth (the repo's skills/ folder).
 *
 * Cross-platform: posix uses "dir" symlinks; Windows uses "junction" (no admin /
 * Developer Mode required, unlike Windows symlinks).
 */
export function installSkills(dryRun: boolean): { actions: Action[]; linked: number; skipped: number } {
  const actions: Action[] = []
  const target = claudeSkillsDir(HOME)
  const linkType = process.platform === "win32" ? "junction" : "dir"

  if (!existsSync(SKILLS)) {
    actions.push({ label: "bundled skills", done: false, detail: `no skill pack at ${SKILLS}` })
    return { actions, linked: 0, skipped: 0 }
  }

  const dirs = readdirSync(SKILLS, { withFileTypes: true }).filter((d) => d.isDirectory())
  const names: string[] = []
  let invalid = 0
  for (const d of dirs) {
    if (isValidSkill(join(SKILLS, d.name))) names.push(d.name)
    else invalid++
  }

  let linked = 0
  let skipped = 0
  if (!dryRun) ensureDir(target)

  for (const name of names) {
    const dest = join(target, name)
    if (existsSync(dest) || isLink(dest)) {
      skipped++
      continue
    }
    if (!dryRun) {
      try {
        symlinkSync(join(SKILLS, name), dest, linkType)
      } catch {
        continue
      }
    }
    linked++
  }

  const invalidNote = invalid > 0 ? `, ${invalid} invalid skipped` : ""
  actions.push({
    label: "bundled skills",
    done: !dryRun,
    detail: `${dryRun ? "would link" : "linked"} ${dryRun ? names.length - skipped : linked} new, ${skipped} present (of ${names.length})${invalidNote} via ${linkType}`,
  })
  return { actions, linked, skipped }
}

function isLink(p: string): boolean {
  try {
    return lstatSync(p).isSymbolicLink()
  } catch {
    return false
  }
}
