import { chmodSync } from "node:fs"
import { HOME, backup, readConfig, writeJSON, writeText, ensureDir, type Action } from "../util.ts"
import { HOOK_MJS } from "../templates.ts"
import { claudeHooksDir, claudeHookPath, claudeSettings } from "../paths.ts"

/**
 * Install skill enforcement for Claude Code (cross-platform):
 *  1. Drop the Node forced-eval hook into ~/.claude/hooks/ (Node runs on Win+posix)
 *  2. Wire it into ~/.claude/settings.json under hooks.UserPromptSubmit (idempotent)
 */
export function installClaude(dryRun: boolean): Action[] {
  const actions: Action[] = []
  const hooksDir = claudeHooksDir(HOME)
  const hookPath = claudeHookPath(HOME)
  const settingsPath = claudeSettings(HOME)
  const cmd = `node "${hookPath}"`

  // 1. hook script (Node, absolute path → no shell ~ expansion needed on Windows)
  if (!dryRun) {
    ensureDir(hooksDir)
    writeText(hookPath, HOOK_MJS)
    try {
      chmodSync(hookPath, 0o755)
    } catch {
      // chmod is a no-op / may throw on Windows — safe to ignore
    }
  }
  actions.push({ label: "hook script", done: !dryRun, detail: hookPath })

  // 2. settings.json wiring (idempotent — matches old .sh or new .mjs installs)
  const read = readConfig<any>(settingsPath, {})
  if (read.existed && !read.strict) {
    // Only rewrite strict JSON. A jsonc/comment-bearing or unparseable settings.json is left
    // untouched — rewriting it would strip comments or (worse) clobber a config we misread.
    const why = read.parsed ? "not strict JSON (comments/jsonc)" : "unreadable"
    actions.push({ label: "settings.json wiring", done: false, detail: `${why} — left untouched, wire the hook manually` })
    return actions
  }
  const settings = read.value
  settings.hooks ??= {}
  settings.hooks.UserPromptSubmit ??= []
  const already = JSON.stringify(settings.hooks.UserPromptSubmit).includes("skill-forced-eval")

  if (already) {
    actions.push({ label: "settings.json wiring", done: true, detail: "already wired (skipped)" })
  } else if (dryRun) {
    actions.push({ label: "settings.json wiring", done: false, detail: "would add UserPromptSubmit hook" })
  } else {
    const bak = backup(settingsPath)
    settings.hooks.UserPromptSubmit.unshift({ hooks: [{ type: "command", command: cmd }] })
    writeJSON(settingsPath, settings)
    actions.push({ label: "settings.json wiring", done: true, detail: bak ? `wired (backup: ${bak})` : "wired (new file)" })
  }

  return actions
}
