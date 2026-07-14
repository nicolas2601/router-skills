import { chmodSync } from "node:fs"
import { HOME, backup, readConfig, writeJSON, writeText, ensureDir, hookCommand, onPath, type Action } from "../util.ts"
import {
  GATE_LIB_MJS,
  GATE_EVAL_MJS,
  GATE_TRACK_MJS,
  GATE_STOP_MJS,
  ROUTER_CORE_MJS,
  SKILL_ROUTER_MJS,
  USAGE_TRACKER_MJS,
} from "../templates.ts"
import {
  claudeHooksDir,
  claudeGateLib,
  claudeGateEval,
  claudeGateTrack,
  claudeGateStop,
  claudeRouterCore,
  claudeSkillRouter,
  claudeUsageTracker,
  claudeSettings,
} from "../paths.ts"
// Plain JS ESM, typechecked via `allowJs` + its JSDoc (`Deps`/`FsLike`) — the SAME module the
// hooks themselves run, so the installer can never pre-build with a different scorer/indexer.
import { ensureIndex, defaultDeps } from "../../gate/core/router-core.mjs"

/** One `settings.json` hook entry (`{matcher?, hooks:[{type,command}]}`) — shape-opaque on purpose. */
type HookEntry = any
type HookMap = Record<string, HookEntry[]>

/** Precomputed hook command strings. Passed IN (not derived) because `hookCommand()` does a
 *  real PATH lookup — impure, and it would make the plan un-hermetically-testable. */
export type HookCmds = {
  gateEval: string
  gateTrack: string
  gateStop: string
  skillRouter: string
  usageTracker: string
}

export type ClaudeHooksPlan = {
  UserPromptSubmit: HookEntry[]
  PostToolUse: HookEntry[]
  Stop: HookEntry[]
  /** Reporting only — every entry this plan REMOVED. Never written to settings.json. */
  strippedEntries: HookEntry[]
}

/**
 * W5: needles are EXACT hook FILENAMES (ours, and the legacy bash ones we shipped before),
 * never bare words. A loose `"skill-router"` substring test silently deleted a user's own
 * `my-skill-router-lint.sh`, and any third-party `usage-tracker`-named hook, on EVERY
 * install — undisclosed deletion of config we did not create. A `.bak` does not make that
 * acceptable; precision + reporting does.
 */
const LEGACY_UPS = ["skill-router.sh", "skill-forced-eval.sh", "skill-forced-eval.mjs"]
const LEGACY_PTU = ["usage-tracker.sh"]

/** Split `arr` into the entries we keep and the ones we own-and-remove. */
function strip(arr: HookEntry[], needles: string[]): { kept: HookEntry[]; removed: HookEntry[] } {
  const kept: HookEntry[] = []
  const removed: HookEntry[] = []
  for (const entry of arr) {
    const json = JSON.stringify(entry)
    if (needles.some((n) => json.includes(n))) removed.push(entry)
    else kept.push(entry)
  }
  return { kept, removed }
}

/**
 * PURE. Compute the three hook arrays this installer owns, given the CURRENT hooks object
 * and the precomputed commands. Idempotent: our own prior wiring is stripped and re-added,
 * so re-running never duplicates. Third-party entries are preserved verbatim.
 */
export function planClaudeHooks(hooks: Record<string, any>, cmds: HookCmds): ClaudeHooksPlan {
  const ups = strip(Array.isArray(hooks.UserPromptSubmit) ? hooks.UserPromptSubmit : [], [
    cmds.gateEval,
    cmds.skillRouter,
    "skill-gate-eval.mjs",
    "skill-router.mjs",
    ...LEGACY_UPS,
  ])
  const ptu = strip(Array.isArray(hooks.PostToolUse) ? hooks.PostToolUse : [], [
    cmds.gateTrack,
    cmds.usageTracker,
    "skill-gate-track.mjs",
    "skill-usage-tracker.mjs",
    ...LEGACY_PTU,
  ])
  const stop = strip(Array.isArray(hooks.Stop) ? hooks.Stop : [], [cmds.gateStop, "skill-gate-stop.mjs"])

  return {
    // gate-eval strictly first (it writes the turn contract the router advisory rides on),
    // skill-router second, then everything third-party, untouched.
    UserPromptSubmit: [
      { hooks: [{ type: "command", command: cmds.gateEval }] },
      { hooks: [{ type: "command", command: cmds.skillRouter }] },
      ...ups.kept,
    ],
    PostToolUse: [
      { matcher: "Skill", hooks: [{ type: "command", command: cmds.gateTrack }] },
      { matcher: "*", hooks: [{ type: "command", command: cmds.usageTracker }] },
      ...ptu.kept,
    ],
    Stop: [{ hooks: [{ type: "command", command: cmds.gateStop }] }, ...stop.kept],
    strippedEntries: [...ups.removed, ...ptu.removed, ...stop.removed],
  }
}

/**
 * PURE. Merge the plan into an EXISTING hooks object.
 *
 * K1: this MUST be a spread-merge. `settings.hooks = plan` was a wholesale REPLACE —
 * `planClaudeHooks` only ever returns the 3 events it owns, so assigning its result over
 * the whole `hooks` object silently DELETED every other event the user or a third-party
 * plugin had wired (`PreToolUse`, `SessionStart`, `PreCompact`, `SubagentStop`,
 * `Notification`, `SessionEnd`). Only the 3 real hook-event fields are picked off the plan,
 * so the reporting-only `strippedEntries` can never leak into settings.json either.
 */
export function mergeClaudeSettingsHooks(existing: Record<string, any>, plan: ClaudeHooksPlan): HookMap {
  return {
    ...existing,
    UserPromptSubmit: plan.UserPromptSubmit,
    PostToolUse: plan.PostToolUse,
    Stop: plan.Stop,
  }
}

/**
 * Install the skill-gate + router for Claude Code (cross-platform):
 *  1. Drop 7 Node files into ~/.claude/hooks/ (router-core + gate lib/eval/track/stop +
 *     skill-router + skill-usage-tracker)
 *  2. Wire the hook points into settings.json (idempotent, re-run safe):
 *       UserPromptSubmit → gate-eval, skill-router
 *       PostToolUse:Skill → gate-track   |  PostToolUse:*  → skill-usage-tracker
 *       Stop              → gate-stop    (BLOCKS turn-end until required loaded)
 * Only strict JSON is rewritten — a jsonc/unreadable settings.json is left alone.
 */
export function installClaude(dryRun: boolean): Action[] {
  const actions: Action[] = []
  const hooksDir = claudeHooksDir(HOME)
  const lib = claudeGateLib(HOME)
  const evalHook = claudeGateEval(HOME)
  const trackHook = claudeGateTrack(HOME)
  const stopHook = claudeGateStop(HOME)
  const core = claudeRouterCore(HOME)
  const routerHook = claudeSkillRouter(HOME)
  const trackerHook = claudeUsageTracker(HOME)
  const settingsPath = claudeSettings(HOME)

  // 1. hook files
  if (!dryRun) {
    ensureDir(hooksDir)
    writeText(core, ROUTER_CORE_MJS)
    writeText(lib, GATE_LIB_MJS)
    writeText(evalHook, GATE_EVAL_MJS)
    writeText(trackHook, GATE_TRACK_MJS)
    writeText(stopHook, GATE_STOP_MJS)
    writeText(routerHook, SKILL_ROUTER_MJS)
    writeText(trackerHook, USAGE_TRACKER_MJS)
    for (const f of [evalHook, trackHook, stopHook, routerHook, trackerHook]) {
      try {
        chmodSync(f, 0o755)
      } catch {
        // chmod is a no-op / may throw on Windows — safe to ignore
      }
    }
  }
  actions.push({
    label: "gate hook files",
    done: !dryRun,
    detail: `${hooksDir} (router-core+lib+eval+track+stop+skill-router+skill-usage-tracker)`,
  })

  // The hooks are named to run with a concrete runtime; if neither node nor bun is on
  // PATH the wired command would silently no-op (the classic Windows failure).
  if (!onPath("node") && !onPath("bun")) {
    actions.push({
      label: "runtime check",
      done: false,
      detail: "neither node nor bun found on PATH — hooks will not run until one is installed",
    })
  }

  // 2. settings.json wiring — only strict JSON is safe to rewrite
  const read = readConfig<any>(settingsPath, {})
  if (read.existed && !read.strict) {
    const why = read.parsed ? "not strict JSON (comments/jsonc)" : "unreadable"
    actions.push({ label: "settings.json wiring", done: false, detail: `${why} — left untouched, wire the 5 hooks manually` })
    return actions
  }
  const settings = read.value
  const existingHooks: Record<string, any> = settings.hooks ?? {}

  const wasWired =
    JSON.stringify(existingHooks.UserPromptSubmit ?? []).includes("skill-gate-eval") ||
    JSON.stringify(existingHooks.Stop ?? []).includes("skill-gate-stop")

  if (dryRun) {
    actions.push({
      label: "settings.json wiring",
      done: false,
      detail: "would wire UserPromptSubmit(eval+router) + PostToolUse:Skill(track)+*(tracker) + Stop(stop)",
    })
    return actions
  }

  const cmds: HookCmds = {
    gateEval: hookCommand(evalHook),
    gateTrack: hookCommand(trackHook),
    gateStop: hookCommand(stopHook),
    skillRouter: hookCommand(routerHook),
    usageTracker: hookCommand(trackerHook),
  }
  const plan = planClaudeHooks(existingHooks, cmds)
  const bak = backup(settingsPath)
  settings.hooks = mergeClaudeSettingsHooks(existingHooks, plan)

  writeJSON(settingsPath, settings)
  actions.push({
    label: "settings.json wiring",
    done: true,
    detail: (wasWired ? "re-wired" : "wired") + (bak ? ` (backup: ${bak})` : " (new file)"),
  })

  // W5: never delete config silently — say exactly what was removed (and that a backup exists).
  if (plan.strippedEntries.length > 0) {
    actions.push({
      label: "legacy hook cleanup",
      done: true,
      detail: `removed ${plan.strippedEntries.length} superseded entr${plan.strippedEntries.length === 1 ? "y" : "ies"}: ${plan.strippedEntries
        .map((e) => JSON.stringify(e))
        .join(" | ")}`,
    })
  }

  return actions
}

/**
 * W1: pre-build the skill/agent index. Extracted OUT of `installClaude` on purpose — it
 * MUST run AFTER `installSkills`/`installAgents`, which are what actually populate
 * `~/.claude/skills` / `~/.claude/agents`. Inside `installClaude` it ran BEFORE them, so on
 * a genuinely fresh machine it always indexed an empty (often non-existent) dir, produced 0
 * rows, and reported a benign-sounding "no skills found yet" — a pre-build that did nothing
 * at all. Claude Code self-heals on the next prompt; an opencode-only install does NOT.
 */
export function preBuildClaudeIndex(dryRun: boolean): Action[] {
  if (dryRun) {
    return [{ label: "skill/agent index", done: false, detail: "would pre-build ~/.claude/.router-cache" }]
  }
  try {
    const info = ensureIndex(defaultDeps())
    if (info.indexError) {
      return [{ label: "skill/agent index", done: false, detail: `index build FAILED: ${info.indexError}` }]
    }
    return [
      {
        label: "skill/agent index",
        done: info.skills > 0,
        detail: `${info.skills} skills, ${info.agents} agents indexed`,
      },
    ]
  } catch (e: any) {
    return [{ label: "skill/agent index", done: false, detail: `index build FAILED: ${e?.message ?? String(e)}` }]
  }
}
