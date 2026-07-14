/**
 * skill-gate-lib.mjs — THIN ADAPTER over `../core/router-core.mjs`.
 *
 * This file used to carry its OWN hand-written copy of the scorer (STOPWORDS,
 * AMBIENT, tokenize, scoreSkills, classify, loadIndex). That copy was one of the
 * two twins that DRIFTED (the other lived in the opencode plugin) — the whole
 * point of `gate/core/router-core.mjs` is that there is now exactly ONE scorer.
 * Everything scoring-related below is a re-export or a 3-line wrapper; nothing is
 * re-implemented here.
 *
 * What DOES legitimately live here (Claude-gate-specific, not scoring):
 *   - the real-fs `DEPS` adapter (router-core is hermetic: every function takes
 *     `deps` explicitly, and this is one of the few allowed places to bind the
 *     real fs/env/home/cwd/clock),
 *   - the `~/.claude/.skillgate/` per-session contract paths,
 *   - `readSkillBody` (SKILL.md lookup — a gate-only concern),
 *   - `ensureGateIndex()` — builds the on-disk index BEFORE any scoring happens,
 *     so turn 1 on a fresh install is never a silent no-op.
 *
 * Consumers: skill-gate-eval.mjs (UserPromptSubmit), skill-gate-track.mjs
 * (PostToolUse:Skill), skill-gate-stop.mjs (Stop).
 *
 * Pure Node ESM, no deps, cross-platform.
 */

import {
  defaultDeps,
  ensureIndex,
  loadIndex as coreLoadIndex,
  scoreGate,
  skillsIndexPath as coreSkillsIndexPath,
  classify,
  STRONG,
  SOFT_MIN,
} from "../core/router-core.mjs";

/**
 * The real-fs/env/home adapter. Module-scope on purpose: these three hooks are
 * process-per-turn entrypoints, so binding once at import time is correct and keeps
 * every call site below free of `deps` plumbing. `router-core.mjs` itself NEVER
 * touches the real bindings — `defaultDeps()` is the single place they are read.
 */
const DEPS = defaultDeps();

export { classify, STRONG, SOFT_MIN };

export const INDEX_PATH = coreSkillsIndexPath(DEPS);
export const GATE_DIR = DEPS.path.join(DEPS.home, ".claude", ".skillgate");

// Directories where a skill's SKILL.md may live (first hit wins).
const SKILL_DIRS = [
  DEPS.path.join(DEPS.home, ".claude", "skills"),
  DEPS.path.join(DEPS.home, ".agents", "skills"),
  DEPS.path.join(DEPS.home, ".config", "opencode", "skills"),
];

export function ensureGateDir() {
  try {
    if (!DEPS.fs.existsSync(GATE_DIR)) DEPS.fs.mkdirSync(GATE_DIR, { recursive: true });
  } catch {
    // fail-open: the caller's own write will surface the real error loudly.
  }
  return GATE_DIR;
}

export function gatePaths(sessionId) {
  const sid = (sessionId || "default").replace(/[^A-Za-z0-9_-]/g, "_");
  ensureGateDir();
  return {
    required: DEPS.path.join(GATE_DIR, `${sid}.required.json`),
    activated: DEPS.path.join(GATE_DIR, `${sid}.activated`),
    blocks: DEPS.path.join(GATE_DIR, `${sid}.blocks`),
  };
}

/**
 * K4b: build (or refresh) the skill/agent index BEFORE anything scores against it.
 * Without this, turn 1 on a fresh install scores against a file nobody wrote yet ->
 * `[]` -> the gate silently evaluates nothing at all, self-healing only from turn 2.
 * Returns router-core's `ensureIndex` report ({skills, agents, empty, indexError, ...}).
 */
export function ensureGateIndex() {
  return ensureIndex(DEPS);
}

/** Load the skill index as [{name, desc}]. Returns [] if missing/unreadable. */
export function loadIndex(indexPath = INDEX_PATH) {
  return coreLoadIndex(indexPath, DEPS);
}

/**
 * Score `prompt` against the index. Thin wrapper: the scoring math itself is
 * `scoreGate` in router-core — the SINGLE source of truth both harnesses share.
 */
export function scoreSkills(prompt, { max = 12, indexPath = INDEX_PATH } = {}) {
  return scoreGate(prompt, loadIndex(indexPath), { max });
}

/** Find and read a skill's SKILL.md body (truncated). "" if not found. */
export function readSkillBody(name, maxChars = 2500) {
  for (const dir of SKILL_DIRS) {
    const p = DEPS.path.join(dir, name, "SKILL.md");
    try {
      if (DEPS.fs.existsSync(p)) {
        const body = DEPS.fs.readFileSync(p, "utf8").trim();
        return body.length > maxChars ? body.slice(0, maxChars) + "\n…[truncated]" : body;
      }
    } catch {
      // unreadable — try the next dir
    }
  }
  return "";
}
