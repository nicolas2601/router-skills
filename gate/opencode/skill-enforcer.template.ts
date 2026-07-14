/**
 * skill-enforcer — OpenCode plugin (installed by router-skills)
 *
 * PLUGIN SHELL ONLY. This file's scorer identifiers (STOPWORDS, AMBIENT, tokenize,
 * scoreGate, scoreRouter, classify, loadIndex, defaultDeps, skillsIndexPath, STRONG,
 * SOFT_MIN, and friends) are NOT imported here — they are supplied by `router-core.mjs`,
 * de-exported and prepended verbatim by `scripts/gen-templates.mjs` at generate time
 * (see design.md's D6). This file is NEVER used standalone; only the composed
 * `PLUGIN_TS` string constant (core + this shell) is shipped and copied to
 * `~/.config/opencode/plugins/skill-enforcer.ts`.
 *
 * Real skill-gate (parity with the Claude Code skill-gate hooks), now with the SAME
 * scoring math as Claude Code (no more hand-copied, drifted scorer — that drift, an
 * incomplete STOPWORDS set missing the accented "también", is exactly the bug this
 * unification closes). Four pieces:
 *   1. Deterministic contract  — score the user message, split into required
 *      (strong; enforced) and suggested (complementary; uncapped, never blocked).
 *   2. Gate (tool.execute.before) — block the first "work" tool until the
 *      required skills are loaded. Real enforcement, not advisory text.
 *   3. Aggressive auto-inject  — inline the top-2 SKILL.md bodies into the
 *      system prompt so the guidance is present even before any skill call.
 *   4. Router advisory (NEW)  — opencode gains router-level suggestions (the same
 *      `scoreRouter`+`classify` Claude Code's skill-router.mjs uses) for the first
 *      time, injected as a complementary, non-enforced advisory block.
 *
 * Fail-open: every hook except the intentional gate throw is wrapped so a plugin
 * error can never break the chat pipeline. Auto-loaded from ~/.config/opencode/plugins/.
 */

import type { Plugin } from "@opencode-ai/plugin"

const CORE_DEPS = defaultDeps()
const SKILL_INDEX_PATH = skillsIndexPath(CORE_DEPS)
const HOME = nodeHomedir()
const SKILL_DIRS = [
  nodePath.join(HOME, ".config", "opencode", "skills"),
  nodePath.join(HOME, ".claude", "skills"),
  nodePath.join(HOME, ".agents", "skills"),
]

const WORK_TOOLS = new Set(["write", "edit", "patch", "bash", "multiedit"])
const MARKER = "MANDATORY SKILL EVALUATION"

// ---- index loading (mirror of skill-gate-lib.mjs's real-fs adapter) ---------

// C1: THE ORIGINAL BUG, reintroduced verbatim for opencode. `ensureIndex()` is what
// actually BUILDS the on-disk index — its only call sites used to be Claude-only
// (installClaude, skill-gate-eval.mjs, skill-router.mjs). An opencode-only user (no
// Claude Code installed at all) got NO index from anyone: `loadIndex` read a file that was
// never written -> `[]` -> `if (INDEX_CACHE) return INDEX_CACHE` cached it FOREVER (arrays
// are always truthy in JS — the old comment claiming "[] is truthy" was describing a
// symptom, not this module's real bug) -> `scoreGate` always `[]` -> the tool gate NEVER
// fires, silently, for the entire life of the plugin process, with no opencode equivalent
// of `[ROUTER WARNING]`/`[GATE WARNING]` anywhere in this file.
//
// Fixed: `getIndex()` now calls `ensureIndex(CORE_DEPS)` itself (the plugin is the only
// thing that will ever run for an opencode-only install), caches ONLY a genuinely
// non-empty index (an explicit `!== null` check on the cache slot itself — never inferred
// from array truthiness), and computes a LOUD `INDEX_WARNING` whenever the index build
// failed or is still empty. Not caching the empty state means a later chat turn in the
// SAME process self-heals automatically once skills actually appear on disk (e.g. a
// Claude Code hook builds it in parallel, or the user runs router-skills mid-session) —
// never stuck silently broken for the process lifetime again.
let INDEX_CACHE: { name: string; desc: string }[] | null = null
let INDEX_WARNING = ""
function getIndex(): { name: string; desc: string }[] {
  if (INDEX_CACHE !== null) return INDEX_CACHE
  const info = ensureIndex(CORE_DEPS)
  const idx = loadIndex(SKILL_INDEX_PATH, CORE_DEPS)
  if (info.indexError) {
    INDEX_WARNING = `[SKILL GATE WARNING] index build failed (${info.indexError}) — enforcement INACTIVE.`
  } else if (idx.length === 0) {
    INDEX_WARNING = "[SKILL GATE WARNING] no skills installed yet — enforcement INACTIVE. Corré `router-skills` o `npx skills add ...`."
  } else {
    INDEX_WARNING = ""
  }
  if (idx.length > 0) INDEX_CACHE = idx // never cache an empty/failed build permanently
  return idx
}

function readSkillBody(name: string, maxChars = 2500): string {
  for (const dir of SKILL_DIRS) {
    const p = nodePath.join(dir, name, "SKILL.md")
    if (nodeFs.existsSync(p)) {
      const body = nodeFs.readFileSync(p, "utf8").trim()
      return body.length > maxChars ? body.slice(0, maxChars) + "\n…[truncated]" : body
    }
  }
  return ""
}

// ---- per-session turn state -------------------------------------------------

type TurnState = {
  required: string[]
  suggested: string[]
  routerRequired: string[]
  routerSuggested: string[]
  loaded: Set<string>
  blocked: boolean
}
const SESSIONS = new Map<string, TurnState>()
let LAST: TurnState | null = null // fallback bridge chat.message → system.transform

function stateFor(sessionID?: string): TurnState {
  const key = sessionID || "__last__"
  let s = SESSIONS.get(key)
  if (!s) {
    s = { required: [], suggested: [], routerRequired: [], routerSuggested: [], loaded: new Set(), blocked: false }
    SESSIONS.set(key, s)
  }
  return s
}

function textFromParts(parts: any[]): string {
  if (!Array.isArray(parts)) return ""
  return parts
    .filter((p) => p && (p.type === "text" || typeof p.text === "string"))
    .map((p) => p.text || "")
    .join(" ")
}

const DIRECTIVE = `## ${MARKER} (a tool gate enforces the required set)

Load every skill that genuinely helps THIS task BEFORE running work tools
(write/edit/bash). There is NO limit — if several skills complement each other,
load ALL of them. The first work tool is BLOCKED until the required set is
loaded. Naming a skill without loading it is worthless.`

export const SkillEnforcer: Plugin = async () => {
  return {
    // Piece 1: score the incoming user message (gate math), arm the turn contract.
    // Piece 4 (NEW): ALSO score router-level (scoreRouter+classify) for an advisory
    // block — opencode gaining router-level suggestions for the first time (AC-13).
    "chat.message": async (_input: any, output: any) => {
      try {
        const parts = output?.parts ?? output?.message?.parts ?? []
        const text = textFromParts(parts)
        const idx = getIndex()
        const { required, suggested } = classify(scoreGate(text, idx))
        const { required: routerRequired, suggested: routerSuggested } = classify(scoreRouter(text, idx, CORE_DEPS))
        const s = stateFor(output?.message?.sessionID)
        s.required = required
        s.suggested = suggested
        s.routerRequired = routerRequired
        s.routerSuggested = routerSuggested
        s.loaded = new Set()
        s.blocked = false
        LAST = s
      } catch {
        // fail open — never break message handling
      }
    },

    // Pieces 1 + 3 + 4: inject directive + required + suggested + top-2 skill bodies +
    // the router advisory block (complementary, never gate-enforced).
    "experimental.chat.system.transform": async (_input: any, output: any) => {
      try {
        if (!output || typeof output !== "object") return
        const sys: any[] = Array.isArray(output.system) ? output.system : (output.system = [])
        if (sys.some((x) => typeof x === "string" && x.includes(MARKER))) return // idempotent
        const s = LAST
        let block = DIRECTIVE
        // C1: a LOUD, never-silent warning when the index is empty or failed to build —
        // the exact bug this whole change exists to kill, now closed for opencode too.
        if (INDEX_WARNING) block += `\n\n${INDEX_WARNING}`
        if (s && s.required.length > 0) {
          block += `\n\nREQUIRED_SKILLS (strong match — a work tool is blocked until each is loaded):\n  ${s.required.join(", ")}`
        }
        if (s && s.suggested.length > 0) {
          block += `\n\nSUGGESTED_SKILLS (complementary — NOT enforced, but load every one that genuinely helps; combining several is expected):\n  ${s.suggested.join(", ")}`
        }
        if (s && (s.routerRequired.length > 0 || s.routerSuggested.length > 0)) {
          block += `\n\nROUTER_SUGGESTIONS (advisory — router-level match, NOT gate-enforced, complementary to the required/suggested sets above):\n  ${[...s.routerRequired, ...s.routerSuggested].join(", ")}`
        }
        if (s && (s.required.length > 0 || s.suggested.length > 0)) {
          const injected: string[] = []
          for (const name of [...s.required, ...s.suggested].slice(0, 2)) {
            const body = readSkillBody(name)
            if (body) injected.push(`\n----- AUTO-INJECTED SKILL: ${name} -----\n${body}`)
          }
          if (injected.length > 0) {
            block += `\n\nPre-loaded skill bodies (still call the skill tool so tooling runs):\n${injected.join("\n")}`
          }
        }
        const last = sys.length - 1
        if (last >= 0 && typeof sys[last] === "string") sys[last] += "\n\n" + block
        else sys.push(block)
      } catch {
        // fail open
      }
    },

    // Piece 2 tracking: record skill loads.
    "tool.execute.after": async (input: any, output: any) => {
      try {
        const tool = String(input?.tool || "").toLowerCase()
        const s = stateFor(input?.sessionID)
        if (tool.includes("skill")) {
          const arg = input?.args?.skill || input?.args?.name || output?.title || ""
          if (arg) s.loaded.add(String(arg).trim().toLowerCase())
        }
        if (s.required.some((r) => r.toLowerCase() === tool)) s.loaded.add(tool)
      } catch {
        // fail open
      }
    },

    // Piece 2 gate: block the first work tool until required skills are loaded.
    // The scoring is fail-open (errors → no block); the block itself is intentional.
    "tool.execute.before": async (input: any, _output: any) => {
      let missing: string[] = []
      try {
        const tool = String(input?.tool || "").toLowerCase()
        if (!WORK_TOOLS.has(tool)) return
        const s = stateFor(input?.sessionID)
        if (s.required.length === 0 || s.blocked) return
        missing = s.required.filter((r) => !s.loaded.has(r.toLowerCase()))
        if (missing.length === 0) return
        s.blocked = true // one block per turn — never deadlock
      } catch {
        return // fail open — a scorer error must never block work
      }
      throw new Error(
        `SKILL GATE: cargá las skills OBLIGATORIAS de este turno antes de trabajar: ${missing.join(", ")}. ` +
          `Usá la herramienta de skills con cada una y volvé a intentar. No las anuncies: cargalas de verdad.`,
      )
    },
  }
}

export default SkillEnforcer
