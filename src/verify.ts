import { existsSync, readdirSync, readFileSync } from "node:fs"
import { HOME, readConfig } from "./util.ts"
import {
  claudeHookPath,
  claudeSettings,
  claudeSkillsDir,
  claudeAgentsDir,
  opencodePlugin,
  opencodeConfig,
  opencodeRuleFile,
  opencodeAgentsDir,
} from "./paths.ts"

/** A single read-only health check. `ok:null` = not applicable (target not installed). */
export type Check = { name: string; ok: boolean | null; detail: string }

const count = (dir: string): number => {
  try {
    return readdirSync(dir).length
  } catch {
    return 0
  }
}

/** Read-only audit of what router-skills has (or hasn't) installed. Writes nothing. */
export function verify(): Check[] {
  const checks: Check[] = []

  // ── Claude Code ────────────────────────────────────────────────
  const hook = claudeHookPath(HOME)
  checks.push({ name: "claude: hook script", ok: existsSync(hook), detail: hook })

  const settings = readConfig<any>(claudeSettings(HOME), {})
  if (!settings.existed) {
    checks.push({ name: "claude: settings wiring", ok: null, detail: "settings.json not found" })
  } else if (!settings.parsed) {
    checks.push({ name: "claude: settings wiring", ok: false, detail: "settings.json unreadable" })
  } else {
    const wired = JSON.stringify(settings.value?.hooks?.UserPromptSubmit ?? []).includes("skill-forced-eval")
    checks.push({ name: "claude: settings wiring", ok: wired, detail: wired ? "UserPromptSubmit hook present" : "not wired" })
  }

  const cSkills = count(claudeSkillsDir(HOME))
  checks.push({ name: "claude: skills linked", ok: cSkills > 0, detail: `${cSkills} in ~/.claude/skills` })
  const cAgents = count(claudeAgentsDir(HOME))
  checks.push({ name: "claude: agents linked", ok: cAgents > 0, detail: `${cAgents} in ~/.claude/agents` })

  // ── opencode ───────────────────────────────────────────────────
  const plugin = opencodePlugin(HOME)
  checks.push({ name: "opencode: plugin", ok: existsSync(plugin), detail: plugin })

  const rule = opencodeRuleFile(HOME)
  checks.push({ name: "opencode: rule file", ok: existsSync(rule), detail: rule })

  const cfg = readConfig<any>(opencodeConfig(HOME), {})
  if (!cfg.existed) {
    checks.push({ name: "opencode: config", ok: null, detail: "opencode.json not found" })
  } else if (!cfg.parsed) {
    checks.push({ name: "opencode: config", ok: false, detail: "opencode.json unreadable" })
  } else {
    const hasRule = Array.isArray(cfg.value?.instructions) && cfg.value.instructions.includes("skill-enforcement.md")
    const skillAllow = cfg.value?.permission?.skill?.["*"] === "allow"
    const taskAllow = cfg.value?.permission?.task?.["*"] === "allow"
    checks.push({
      name: "opencode: config",
      ok: hasRule && skillAllow && taskAllow,
      detail: `instructions=${hasRule ? "yes" : "no"}, skill=${skillAllow ? "allow" : "unset"}, task=${taskAllow ? "allow" : "unset"}`,
    })
  }

  const oAgents = count(opencodeAgentsDir(HOME))
  checks.push({ name: "opencode: agents converted", ok: oAgents > 0, detail: `${oAgents} in ~/.config/opencode/agents` })

  // opencode agents must be schema-valid (mode: subagent) — sample-check a few
  const sample = sampleOpencodeAgents(opencodeAgentsDir(HOME), 25)
  if (sample.total > 0) {
    const bad = sample.total - sample.valid
    checks.push({
      name: "opencode: agent format",
      ok: bad === 0,
      detail: `${sample.valid}/${sample.total} sampled have mode: subagent${bad ? ` — ${bad} invalid` : ""}`,
    })
  }

  return checks
}

function sampleOpencodeAgents(dir: string, limit: number): { total: number; valid: number } {
  let total = 0
  let valid = 0
  try {
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".md")) continue
      if (total >= limit) break
      total++
      try {
        const head = readFileSync(`${dir}/${name}`, "utf8").slice(0, 512)
        if (/\bmode:\s*subagent\b/.test(head) && /\bdescription:/.test(head)) valid++
      } catch {
        /* unreadable — counts as invalid */
      }
    }
  } catch {
    /* dir missing */
  }
  return { total, valid }
}
