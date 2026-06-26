import { HOME, backup, readJSON, writeJSON, writeText, ensureDir, type Action } from "../util.ts"
import { PLUGIN_TS } from "../templates.ts"
import { opencodePluginsDir, opencodePlugin, opencodeConfig } from "../paths.ts"

/**
 * Install skill enforcement for opencode (cross-platform):
 *  1. Drop the skill-enforcer plugin into ~/.config/opencode/plugins/ (auto-loaded)
 *  2. Set permission.skill["*"] = "allow" in opencode.json (idempotent)
 */
export function installOpencode(dryRun: boolean): Action[] {
  const actions: Action[] = []
  const pluginsDir = opencodePluginsDir(HOME)
  const pluginPath = opencodePlugin(HOME)
  const configPath = opencodeConfig(HOME)

  // 1. plugin
  if (!dryRun) {
    ensureDir(pluginsDir)
    writeText(pluginPath, PLUGIN_TS)
  }
  actions.push({ label: "plugin", done: !dryRun, detail: pluginPath })

  // 2. permission.skill allow (idempotent)
  const cfg = readJSON<any>(configPath, {})
  cfg.permission ??= {}
  const cur = cfg.permission.skill
  const need = !cur || cur["*"] !== "allow"

  if (!need) {
    actions.push({ label: "permission.skill", done: true, detail: "already allow (skipped)" })
  } else if (dryRun) {
    actions.push({ label: "permission.skill", done: false, detail: 'would set skill["*"]="allow"' })
  } else {
    const bak = backup(configPath)
    cfg.permission.skill = { ...(cur || {}), "*": "allow" }
    writeJSON(configPath, cfg)
    actions.push({ label: "permission.skill", done: true, detail: bak ? `set (backup: ${bak})` : "set (new file)" })
  }

  return actions
}
