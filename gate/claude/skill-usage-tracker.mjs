#!/usr/bin/env node
/**
 * skill-usage-tracker.mjs — Claude Code PostToolUse hook (matcher: "*", tracker port).
 *
 * Ports `~/.claude/hooks/usage-tracker.sh` to cross-platform Node ESM. Reads
 * `last-suggestion.json` (written by skill-router.mjs) and credits or debits it
 * against `claude-tool-stats.json` / `ignored-skills.md` (both via router-core's
 * `recordUse`/`recordIgnore`), feeding `adjust()`'s "3+ ignores -> +2" bump.
 *
 * `main(stdinString, deps)` is the entrypoint tests call directly. The 3-line shim
 * at the bottom is intentionally NOT unit-tested (per design.md).
 *
 * Contract: stdout is ALWAYS empty, exit ALWAYS 0 — a tracker must never influence
 * the turn, so `main` swallows every internal error (fail-open, no exception).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defaultDeps, shouldIgnore, recordUse, recordIgnore, lastSuggestionPath } from "../core/router-core.mjs";

const TRACKED_TOOLS = new Set(["Bash", "Edit", "Write", "Read", "Grep", "Glob"]);

/** Fail-open JSON read: malformed/missing -> null (never throws). */
function readSuggestion(deps) {
  const path = lastSuggestionPath(deps);
  try {
    if (!deps.fs.existsSync(path)) return null;
    return JSON.parse(deps.fs.readFileSync(path, "utf8"));
  } catch {
    return null; // AC-14: invalid JSON treated as absent, never throws
  }
}

function clearSuggestion(deps) {
  try {
    deps.fs.rmSync(lastSuggestionPath(deps), { force: true });
  } catch {
    // best-effort clear; not fatal
  }
}

/**
 * C4: `recordUse`/`recordIgnore` never throw — they return `null` on success or an error
 * string on failure. Collect and return every non-null error from this run so `main` can
 * surface them via `deps.warn` (stdout must stay empty; this is the one side-channel a
 * PostToolUse hook has for a diagnostic that doesn't influence the turn).
 */
function run(stdinString, deps) {
  let evt;
  try {
    evt = JSON.parse(stdinString);
  } catch {
    return null; // AC-14: malformed stdin -> nothing to do
  }

  // F1: honour `evt.cwd` exactly like skill-router.mjs's `parseInput` + `runDeps = cwd ?
  // {...deps, cwd} : deps` does. Without this, `recordUse`/`recordIgnore` write into
  // `memoryDir(deps.home, deps.cwd, deps)` where `deps.cwd` is the hook SUBPROCESS's own
  // `process.cwd()` in production — a different directory than the one skill-router.mjs's
  // `adjust()` reads whenever the two diverge (multi-root workspaces, subshells,
  // subagents, worktrees), silently decoupling the "3+ ignores -> +2" escalation loop.
  const runDeps = evt.cwd ? { ...deps, cwd: evt.cwd } : deps;

  const suggestion = readSuggestion(runDeps);
  if (!suggestion) return null; // AC-10: no suggestion on disk -> exit immediately, write nothing

  const toolName = evt.tool_name || "";
  const toolInput = evt.tool_input || {};

  // "Used" path: Skill tool matching the suggested skill, or Task/Agent tool matching
  // the suggested subagent_type -> credit, clear, never record an ignore even if
  // 30s+ already elapsed.
  if (toolName === "Skill" && suggestion.skill && toolInput.skill === suggestion.skill) {
    const err = recordUse(suggestion.skill, runDeps);
    clearSuggestion(runDeps);
    return err;
  }
  if (
    (toolName === "Task" || toolName === "Agent") &&
    suggestion.agent &&
    toolInput.subagent_type === suggestion.agent
  ) {
    const err = recordUse(suggestion.agent, runDeps);
    clearSuggestion(runDeps);
    return err;
  }

  // "Ignored" path: >30s elapsed + tool in the tracked whitelist + score >= SOFT_MIN,
  // independently for skill/agent (AC-10's "can log one and not the other").
  if (!TRACKED_TOOLS.has(toolName)) return null;
  const ignore = shouldIgnore(runDeps.now(), suggestion, toolName);
  if (!ignore.skill && !ignore.agent) return null;

  const snippet = suggestion.prompt || "";
  const errs = [];
  // C3: recordIgnore itself never throws now (it catches its own write failures), so
  // clearSuggestion() below is UNCONDITIONALLY reached — the exact cascade this fixes:
  // pre-fix, a mid-recordIgnore crash (corrupt stats file) skipped this clear entirely,
  // leaving the same suggestion to be re-processed (and re-appended) on every subsequent
  // tool call.
  if (ignore.skill && suggestion.skill) errs.push(recordIgnore(suggestion.skill, suggestion.skill_score, "skill", snippet, runDeps));
  if (ignore.agent && suggestion.agent) errs.push(recordIgnore(suggestion.agent, suggestion.agent_score, "agent", snippet, runDeps));
  clearSuggestion(runDeps);
  return errs.filter(Boolean).join("; ") || null;
}

export function main(stdinString, deps = defaultDeps()) {
  try {
    const err = run(stdinString, deps);
    if (err) deps.warn(`[TRACKER WARNING] could not persist use/ignore accounting: ${err}`);
  } catch (e) {
    // fail-open: a tracker must never throw or influence the turn — but fail-open is not
    // fail-SILENT (C4): still surface it via the one side-channel available.
    try {
      deps.warn(`[TRACKER WARNING] internal error: ${(e && e.message) || String(e)}`);
    } catch {
      // deps.warn itself is broken — nothing more we can do without risking the turn
    }
  }
  return "";
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(readFileSync(0, "utf8"));
  process.stdout.write("");
  process.exit(0);
}
