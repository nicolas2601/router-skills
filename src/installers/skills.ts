import { readdirSync, existsSync, symlinkSync, lstatSync } from "node:fs"
import { join } from "node:path"
import { HOME, SKILLS, ensureDir, type Action } from "../util.ts"
import { claudeSkillsDir } from "../paths.ts"

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

  const names = readdirSync(SKILLS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(SKILLS, d.name, "SKILL.md")))
    .map((d) => d.name)

  let linked = 0
  let skipped = 0
  if (!dryRun) ensureDir(target)

  for (const name of names) {
    const dest = join(target, name)
    if (existsSync(dest) || isLink(dest)) {
      skipped++
      continue
    }
    if (!dryRun) symlinkSync(join(SKILLS, name), dest, linkType)
    linked++
  }

  actions.push({
    label: "bundled skills",
    done: !dryRun,
    detail: dryRun
      ? `would link ${names.length - skipped} new, ${skipped} present (of ${names.length}) via ${linkType}`
      : `linked ${linked} new, ${skipped} present (of ${names.length}) via ${linkType}`,
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
