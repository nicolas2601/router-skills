import { HOME, backup, readConfig, writeJSON, type Action } from "../util.ts"
import { claudeSettings, opencodeConfig } from "../paths.ts"

/**
 * Token-cost settings for Claude Code and opencode.
 *
 * The design rule that matters: cut token COST, never token-funded CAPABILITY.
 * The widely-copied "cost-saving config" turns off bundled skills, pins
 * effortLevel to "low" and sets MAX_THINKING_TOKENS=0. That does cut the bill —
 * by disabling the reasoning and the skill system you are paying for. This
 * installer refuses to write those keys, and a test enforces the refusal.
 *
 * Everything written here was verified against the Claude Code bundle (v2.1.208)
 * and the opencode config docs — not against blog posts.
 */
export const CAPABILITY_KILLERS = [
  "disableBundledSkills",
  "disableWorkflows",
  "disableAllHooks",
  "MAX_THINKING_TOKENS",
  "DISABLE_AUTO_COMPACT",
  "effortLevel",
] as const

/** Verified env knobs. Values are strings — Claude Code reads them with parseInt. */
const CLAUDE_ENV: Record<string, string> = {
  // Default is far higher; a single noisy test run or build log can otherwise
  // dump tens of thousands of tokens of context in one tool result.
  BASH_MAX_OUTPUT_LENGTH: "20000",
  // MCP tool results are the other big unbounded source. Default 25000.
  MAX_MCP_OUTPUT_TOKENS: "10000",
  // Drops telemetry/survey/tip round-trips.
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
}

type Plan<T> = { next: T; changed: boolean }

/**
 * Fill only what is MISSING. A value the user set explicitly — even one that
 * costs more than ours — is theirs, and stays. That is what makes the installer
 * safe to re-run on every machine, which is the whole point of shipping it.
 */
export function planClaudeTokens(cfg: any): Plan<any> {
  const next = { ...(cfg ?? {}) }
  let changed = false

  const env = { ...(next.env ?? {}) }
  for (const [k, v] of Object.entries(CLAUDE_ENV)) {
    if (env[k] === undefined) {
      env[k] = v
      changed = true
    }
  }
  next.env = env

  // Auto-compact is ON by default in Claude Code; we write it explicitly so the
  // intent survives a settings reset. An explicit `false` is a user choice.
  if (next.autoCompactEnabled === undefined) {
    next.autoCompactEnabled = true
    changed = true
  }
  // Old session transcripts are dead weight on disk, not context — but they are
  // what /resume and auto-memory scan. Bounded retention keeps that cheap.
  if (next.cleanupPeriodDays === undefined) {
    next.cleanupPeriodDays = 20
    changed = true
  }

  return { next, changed }
}

export function planOpencodeTokens(cfg: any): Plan<any> {
  const next = { ...(cfg ?? {}) }
  let changed = false

  const compaction = { ...(next.compaction ?? {}) }
  if (compaction.auto === undefined) {
    compaction.auto = true
    changed = true
  }
  // `prune` drops aged tool outputs from the running context. This is the single
  // biggest opencode-side win: tool results dominate a long session, and old ones
  // are almost never re-read.
  if (compaction.prune === undefined) {
    compaction.prune = true
    changed = true
  }
  next.compaction = compaction

  return { next, changed }
}

/** Write the token settings into both harnesses. Idempotent; backs up before touching. */
export function installTokens(dryRun: boolean): Action[] {
  const actions: Action[] = []

  for (const [label, path, plan] of [
    ["claude settings.json", claudeSettings(HOME), planClaudeTokens],
    ["opencode.json", opencodeConfig(HOME), planOpencodeTokens],
  ] as const) {
    const read = readConfig<any>(path, {})
    // Same rule as the other installers: a jsonc/hand-edited config is not safe to
    // rewrite (it would strip comments), and a lenient parse can misread it.
    if (read.existed && !read.strict) {
      const why = read.parsed ? "jsonc/comments present" : "unreadable"
      actions.push({ label, done: false, detail: `${why} — left untouched; set token knobs manually` })
      continue
    }

    const { next, changed } = plan(read.value)
    if (!changed) {
      actions.push({ label, done: true, detail: "token settings already set (skipped)" })
      continue
    }
    if (dryRun) {
      actions.push({ label, done: false, detail: "would set token-cost knobs" })
      continue
    }
    const bak = backup(path)
    writeJSON(path, next)
    actions.push({ label, done: true, detail: bak ? `updated (backup: ${bak})` : "written (new file)" })
  }

  return actions
}
