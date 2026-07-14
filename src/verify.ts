import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { HOME, readConfig } from "./util.ts"
import {
  claudeGateEval,
  claudeGateStop,
  claudeSettings,
  skillsIndexPath,
  claudeSkillsDir,
  claudeAgentsDir,
  claudeGlobalMd,
  opencodePlugin,
  opencodeConfig,
  opencodeRuleFile,
  opencodeAgentsDir,
  opencodeAgentsMd,
} from "./paths.ts"
import { MINDSET_START } from "./mindset-template.ts"

/** A single read-only health check. `ok:null` = not applicable (target not installed). */
export type Check = { name: string; ok: boolean | null; detail: string }

/**
 * PURE. The router half of the Claude wiring: `skill-router` on UserPromptSubmit AND
 * `skill-usage-tracker` on PostToolUse. Either one missing means the router is only
 * half-installed — suggestions without use/ignore accounting, or accounting with nothing
 * to account for. Mirrors the existing inline `evalWired`/`stopWired` pattern below.
 */
export function routerWiringCheck(hooks: Record<string, any>): { ok: boolean; detail: string } {
  const routerWired = JSON.stringify(hooks?.UserPromptSubmit ?? []).includes("skill-router")
  const trackerWired = JSON.stringify(hooks?.PostToolUse ?? []).includes("skill-usage-tracker")
  const ok = routerWired && trackerWired
  return {
    ok,
    detail: ok ? "skill-router + skill-usage-tracker wired" : `router=${routerWired} tracker=${trackerWired}`,
  }
}

/** The slice of `node:fs` `indexHealthCheck` needs — injectable so the check is hermetic. */
type MinimalFs = {
  existsSync: (p: string) => boolean
  readFileSync: (p: string, enc: string) => string
  statSync: (p: string) => { mtimeMs: number }
}

/**
 * A 0-row index is THE silent-no-op bug this whole change exists to kill: every hook runs,
 * exits 0, prints nothing useful, and the router is inert forever. It must be a VISIBLE,
 * reportable failure — never a quiet `ok:true`. `now` is injectable so age is assertable.
 */
export function indexHealthCheck(
  idxPath: string,
  fs: MinimalFs,
  now: () => number = Date.now,
): { ok: boolean; rows: number; ageMs: number; detail: string } {
  let exists = false
  try {
    exists = fs.existsSync(idxPath)
  } catch {
    exists = false
  }
  if (!exists) {
    return { ok: false, rows: 0, ageMs: 0, detail: `${idxPath} not found — the router will be silently inactive` }
  }

  let rows = 0
  let ageMs = 0
  try {
    rows = fs
      .readFileSync(idxPath, "utf8")
      .split("\n")
      .filter((l) => l.trim()).length
    ageMs = now() - fs.statSync(idxPath).mtimeMs
  } catch (e: any) {
    return { ok: false, rows: 0, ageMs: 0, detail: `${idxPath} unreadable (${e?.message ?? String(e)})` }
  }

  if (rows === 0) {
    return { ok: false, rows, ageMs, detail: "0 rows — the router will be silently inactive (no skills indexed)" }
  }
  return { ok: true, rows, ageMs, detail: `${rows} rows, ${Math.round(ageMs / 1000)}s old` }
}

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
  const evalHook = claudeGateEval(HOME)
  const stopHook = claudeGateStop(HOME)
  const gateFiles = existsSync(evalHook) && existsSync(stopHook)
  checks.push({ name: "claude: gate hooks", ok: gateFiles, detail: gateFiles ? "eval + track + stop present" : `missing (${evalHook})` })

  const settings = readConfig<any>(claudeSettings(HOME), {})
  if (!settings.existed) {
    checks.push({ name: "claude: settings wiring", ok: null, detail: "settings.json not found" })
    checks.push({ name: "claude: router wiring", ok: null, detail: "settings.json not found" })
  } else if (!settings.parsed) {
    checks.push({ name: "claude: settings wiring", ok: false, detail: "settings.json unreadable" })
    checks.push({ name: "claude: router wiring", ok: false, detail: "settings.json unreadable" })
  } else {
    const hooks = settings.value?.hooks ?? {}
    const evalWired = JSON.stringify(hooks.UserPromptSubmit ?? []).includes("skill-gate-eval")
    const stopWired = JSON.stringify(hooks.Stop ?? []).includes("skill-gate-stop")
    const trackWired = JSON.stringify(hooks.PostToolUse ?? []).includes("skill-gate-track")
    const wired = evalWired && stopWired && trackWired
    checks.push({
      name: "claude: settings wiring",
      ok: wired,
      detail: wired ? "eval + track + stop wired" : `eval=${evalWired} track=${trackWired} stop=${stopWired}`,
    })
    const router = routerWiringCheck(hooks)
    checks.push({ name: "claude: router wiring", ok: router.ok, detail: router.detail })
  }

  // The index the router scores against every single turn. 0 rows = silently inert.
  const idx = indexHealthCheck(skillsIndexPath(HOME), {
    existsSync: (p) => existsSync(p),
    readFileSync: (p, enc) => readFileSync(p, enc as BufferEncoding),
    statSync: (p) => statSync(p),
  })
  checks.push({ name: "claude: skills index health", ok: idx.ok, detail: idx.detail })

  checks.push(mindsetCheck("claude: mindset protocol", claudeGlobalMd(HOME)))

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

  checks.push(mindsetCheck("opencode: mindset protocol", opencodeAgentsMd(HOME)))

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

/** Mindset block present? Managed marker OR a hand-rolled custom section both count as ok. */
function mindsetCheck(name: string, file: string): Check {
  if (!existsSync(file)) return { name, ok: false, detail: `${file} not found — run router-skills` }
  try {
    const body = readFileSync(file, "utf8")
    if (body.includes(MINDSET_START)) return { name, ok: true, detail: "managed block present" }
    if (body.includes("CÓMO PIENSA FABLE") || body.includes("Engineering Mindset Protocol"))
      return { name, ok: true, detail: "custom mindset section present" }
    return { name, ok: false, detail: "no mindset block — run router-skills" }
  } catch {
    return { name, ok: false, detail: `${file} unreadable` }
  }
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
