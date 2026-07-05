import { readdirSync, existsSync, symlinkSync, lstatSync, copyFileSync } from "node:fs"
import { join } from "node:path"
import { HOME, AGENTS, ensureDir, type Action } from "../util.ts"
import { claudeAgentsDir, opencodeAgentsDir } from "../paths.ts"

/**
 * Link the bundled agent pack into the harnesses' global agent dirs.
 *   Claude Code → ~/.claude/agents        (reads categorised subdirs recursively)
 *   opencode    → ~/.config/opencode/agents (only when opencode is a chosen target)
 *
 * Cross-platform, no admin needed:
 *   - directory entries (agent categories) → "dir" symlink / Windows "junction"
 *   - loose *.md files at the pack root     → copied (Windows file symlinks need
 *     privilege; junctions are dir-only), so these stay portable.
 *
 * Idempotent: an existing entry at the destination is left untouched.
 */
export function installAgents(dryRun: boolean, opencodePresent: boolean): { actions: Action[] } {
  const actions: Action[] = []

  if (!existsSync(AGENTS)) {
    actions.push({ label: "bundled agents", done: false, detail: `no agent pack at ${AGENTS}` })
    return { actions }
  }

  const linkType = process.platform === "win32" ? "junction" : "dir"
  const entries = readdirSync(AGENTS, { withFileTypes: true })

  const targets: { dir: string; label: string }[] = [
    { dir: claudeAgentsDir(HOME), label: "agents → ~/.claude/agents" },
  ]
  if (opencodePresent) {
    targets.push({ dir: opencodeAgentsDir(HOME), label: "agents → ~/.config/opencode/agents" })
  }

  for (const { dir: target, label } of targets) {
    if (!dryRun) ensureDir(target)
    let linked = 0
    let skipped = 0

    for (const e of entries) {
      const src = join(AGENTS, e.name)
      const dest = join(target, e.name)
      if (existsSync(dest) || isLink(dest)) {
        skipped++
        continue
      }
      if (!dryRun) {
        if (e.isDirectory()) symlinkSync(src, dest, linkType)
        else if (e.isFile() && e.name.endsWith(".md")) copyFileSync(src, dest)
        else continue
      }
      linked++
    }

    actions.push({
      label,
      done: !dryRun,
      detail: dryRun ? `would link ${linked} new, ${skipped} present` : `linked ${linked} new, ${skipped} present`,
    })
  }

  return { actions }
}

function isLink(p: string): boolean {
  try {
    return lstatSync(p).isSymbolicLink()
  } catch {
    return false
  }
}
