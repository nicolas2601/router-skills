import { chmodSync } from "node:fs"
import { HOME, backup, readConfig, writeJSON, writeText, ensureDir, hookCommand, onPath, type Action } from "../util.ts"
import { GATE_LIB_MJS, GATE_EVAL_MJS, GATE_TRACK_MJS, GATE_STOP_MJS } from "../templates.ts"
import {
  claudeHooksDir,
  claudeGateLib,
  claudeGateEval,
  claudeGateTrack,
  claudeGateStop,
  claudeSettings,
} from "../paths.ts"

/**
 * Install the skill-gate for Claude Code (cross-platform):
 *  1. Drop 4 Node files into ~/.claude/hooks/ (lib + eval + track + stop)
 *  2. Wire 3 hook points into settings.json (idempotent, re-run safe):
 *       UserPromptSubmit → gate-eval   (deterministic contract + auto-inject)
 *       PostToolUse:Skill → gate-track  (records activations)
 *       Stop             → gate-stop    (BLOCKS turn-end until required loaded)
 * Only strict JSON is rewritten — a jsonc/unreadable settings.json is left alone.
 */
export function installClaude(dryRun: boolean): Action[] {
  const actions: Action[] = []
  const hooksDir = claudeHooksDir(HOME)
  const lib = claudeGateLib(HOME)
  const evalHook = claudeGateEval(HOME)
  const trackHook = claudeGateTrack(HOME)
  const stopHook = claudeGateStop(HOME)
  const settingsPath = claudeSettings(HOME)

  // 1. hook files
  if (!dryRun) {
    ensureDir(hooksDir)
    writeText(lib, GATE_LIB_MJS)
    writeText(evalHook, GATE_EVAL_MJS)
    writeText(trackHook, GATE_TRACK_MJS)
    writeText(stopHook, GATE_STOP_MJS)
    for (const f of [evalHook, trackHook, stopHook]) {
      try {
        chmodSync(f, 0o755)
      } catch {
        // chmod is a no-op / may throw on Windows — safe to ignore
      }
    }
  }
  actions.push({ label: "gate hook files", done: !dryRun, detail: `${hooksDir} (lib+eval+track+stop)` })

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
    actions.push({ label: "settings.json wiring", done: false, detail: `${why} — left untouched, wire the 3 hooks manually` })
    return actions
  }
  const settings = read.value
  settings.hooks ??= {}
  const h = settings.hooks
  h.UserPromptSubmit ??= []
  h.PostToolUse ??= []
  h.Stop ??= []

  const wasWired =
    JSON.stringify(h.UserPromptSubmit).includes("skill-gate-eval") ||
    JSON.stringify(h.Stop).includes("skill-gate-stop")

  if (dryRun) {
    actions.push({
      label: "settings.json wiring",
      done: false,
      detail: "would wire UserPromptSubmit(eval) + PostToolUse:Skill(track) + Stop(stop)",
    })
    return actions
  }

  // Strip any prior forced-eval / gate wiring so re-runs stay clean (idempotent).
  const strip = (arr: any[], needle: string) => arr.filter((g) => !JSON.stringify(g).includes(needle))
  const bak = backup(settingsPath)
  h.UserPromptSubmit = strip(h.UserPromptSubmit, "skill-forced-eval")
  h.UserPromptSubmit = strip(h.UserPromptSubmit, "skill-gate-eval")
  h.PostToolUse = strip(h.PostToolUse, "skill-gate-track")
  h.Stop = strip(h.Stop, "skill-gate-stop")

  h.UserPromptSubmit.unshift({ hooks: [{ type: "command", command: hookCommand(evalHook) }] })
  h.PostToolUse.push({ matcher: "Skill", hooks: [{ type: "command", command: hookCommand(trackHook) }] })
  h.Stop.unshift({ hooks: [{ type: "command", command: hookCommand(stopHook) }] })

  writeJSON(settingsPath, settings)
  actions.push({
    label: "settings.json wiring",
    done: true,
    detail: (wasWired ? "re-wired" : "wired") + (bak ? ` (backup: ${bak})` : " (new file)"),
  })

  return actions
}
