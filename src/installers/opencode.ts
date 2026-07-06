import { HOME, backup, readConfig, writeJSON, writeText, ensureDir, type Action } from "../util.ts"
import { PLUGIN_TS, SKILL_RULE_MD } from "../templates.ts"
import { opencodePluginsDir, opencodePlugin, opencodeConfig, opencodeRuleFile } from "../paths.ts"

/**
 * Install skill enforcement for opencode (cross-platform):
 *  1. Drop the skill-enforcer plugin into ~/.config/opencode/plugins/ (auto-loaded)
 *  2. Write a skill-enforcement.md rule + register it in opencode.json instructions[]
 *     (belt-and-suspenders: applies even if the plugin fails to load at startup)
 *  3. Set permission.skill["*"] = "allow" in opencode.json (idempotent)
 */
export function installOpencode(dryRun: boolean): Action[] {
  const actions: Action[] = []
  const pluginsDir = opencodePluginsDir(HOME)
  const pluginPath = opencodePlugin(HOME)
  const configPath = opencodeConfig(HOME)
  const rulePath = opencodeRuleFile(HOME)

  // 1. plugin
  if (!dryRun) {
    ensureDir(pluginsDir)
    writeText(pluginPath, PLUGIN_TS)
  }
  actions.push({ label: "plugin", done: !dryRun, detail: pluginPath })

  // 1b. instructions rule file (guaranteed in-context even if the plugin errors)
  if (!dryRun) writeText(rulePath, SKILL_RULE_MD)
  actions.push({ label: "rule file", done: !dryRun, detail: rulePath })

  // 2. opencode.json: register instructions rule + permission.skill allow (one read/write)
  const read = readConfig<any>(configPath, {})
  if (read.existed && !read.strict) {
    // opencode.json is jsonc-capable and often hand-edited. Rewriting it would strip comments,
    // and a lenient parse can misread — so only strict JSON is safe to modify. Otherwise skip.
    const why = read.parsed ? "jsonc/comments present" : "unreadable"
    actions.push({ label: "opencode.json", done: false, detail: `${why} — left untouched; add instructions[]+permission.skill manually` })
    return actions
  }
  const cfg = read.value

  // instructions[] — path relative to ~/.config/opencode (where opencode.json lives)
  const RULE_REF = "skill-enforcement.md"
  cfg.instructions = Array.isArray(cfg.instructions) ? cfg.instructions : []
  const hasRule = cfg.instructions.includes(RULE_REF)

  // permission.skill["*"] = "allow"
  cfg.permission ??= {}
  const curSkill = cfg.permission.skill
  const needPerm = !curSkill || curSkill["*"] !== "allow"

  if (!hasRule && !needPerm) {
    actions.push({ label: "opencode.json", done: true, detail: "instructions + permission already set (skipped)" })
  } else if (dryRun) {
    const parts = [!hasRule ? "add instructions rule" : null, needPerm ? 'set skill["*"]="allow"' : null].filter(Boolean)
    actions.push({ label: "opencode.json", done: false, detail: "would " + parts.join(" + ") })
  } else {
    const bak = backup(configPath)
    if (!hasRule) cfg.instructions.push(RULE_REF)
    if (needPerm) cfg.permission.skill = { ...(curSkill || {}), "*": "allow" }
    writeJSON(configPath, cfg)
    actions.push({ label: "opencode.json", done: true, detail: bak ? `updated (backup: ${bak})` : "written (new file)" })
  }

  return actions
}
