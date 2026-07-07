/**
 * skill-enforcer — OpenCode plugin (installed by router-skills)
 *
 * Real skill-gate (parity with the Claude Code skill-gate hooks). Three pieces:
 *   1. Deterministic contract  — score the user message, split into required
 *      (strong; enforced) and suggested (complementary; uncapped, never blocked).
 *   2. Gate (tool.execute.before) — block the first "work" tool until the
 *      required skills are loaded. Real enforcement, not advisory text.
 *   3. Aggressive auto-inject  — inline the top-2 SKILL.md bodies into the
 *      system prompt so the guidance is present even before any skill call.
 *
 * Fail-open: every hook except the intentional gate throw is wrapped so a plugin
 * error can never break the chat pipeline. Auto-loaded from ~/.config/opencode/plugins/.
 */

import type { Plugin } from "@opencode-ai/plugin"
import { readFileSync, existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const HOME = homedir()
const INDEX_PATH = join(HOME, ".claude", ".router-cache", "skills-index.tsv")
const SKILL_DIRS = [
  join(HOME, ".config", "opencode", "skills"),
  join(HOME, ".claude", "skills"),
  join(HOME, ".agents", "skills"),
]

const WORK_TOOLS = new Set(["write", "edit", "patch", "bash", "multiedit"])
const STRONG = 6 // >= this → HARD-enforced (gate blocks). Below → soft suggestion.
const SOFT_MIN = 3 // minimum score to surface at all
const MARKER = "MANDATORY SKILL EVALUATION"

const STOPWORDS = new Set([
  "the","and","for","with","that","this","you","your","are","can","have","has",
  "was","will","how","what","why","when","where","into","from","then","than",
  "not","but","all","any","get","use","using","please","make","want","need",
  "help","let","lets","add","que","los","las","una","uno","por","con","para",
  "como","esto","esta","este","eso","porque","pero","todo","todos","muy","mas",
  "hacer","haz","quiero","porfavor","porfa","favor","mira","listo","ahora",
  "tambien","aplica","utiliza","sabes","algo","aca","aqui",
])

// Ambient/meta tokens (the tooling itself, not the task domain) score reduced so
// a meta-prompt or a pasted link never force-blocks on irrelevant skills.
const AMBIENT = new Set([
  "claude","code","opencode","skill","skills","hook","hooks","gate","harness",
  "tool","tools","plugin","plugins","run","corre","prueba","pruebalo","probar",
  "test","tests","testing","instalador","instaladores","installer","install",
  "funciona","aplicar","harneses",
  "github","gitlab","bitbucket","com","http","https","www","git","repo","repos",
  "link","url","raw","main","master","branch",
])

// ---- deterministic scorer (mirror of skill-gate-lib.mjs) --------------------

let INDEX_CACHE: { name: string; desc: string }[] | null = null
function loadIndex() {
  if (INDEX_CACHE) return INDEX_CACHE
  const rows: { name: string; desc: string }[] = []
  if (existsSync(INDEX_PATH)) {
    for (const line of readFileSync(INDEX_PATH, "utf8").split("\n")) {
      if (!line.trim()) continue
      const tab = line.indexOf("\t")
      const name = (tab === -1 ? line : line.slice(0, tab)).trim()
      const desc = (tab === -1 ? "" : line.slice(tab + 1)).trim().toLowerCase()
      if (name) rows.push({ name, desc })
    }
  }
  INDEX_CACHE = rows
  return rows
}

function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .split(/[^a-z0-9áéíóúñ]+/i)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
}

function scoreSkills(prompt: string, max = 12): { name: string; score: number }[] {
  const tokens = [...new Set(tokenize(prompt))]
  if (tokens.length === 0) return []
  const scored: { name: string; score: number }[] = []
  for (const { name, desc } of loadIndex()) {
    const nameFlat = name.toLowerCase().replace(/[-_]/g, "")
    const nameTokens = new Set(name.toLowerCase().split(/[-_]/))
    let score = 0
    for (const t of tokens) {
      const amb = AMBIENT.has(t)
      if (nameTokens.has(t)) score += amb ? 0.5 : 3
      else if (nameFlat.includes(t)) score += amb ? 0 : 1.5
      if (desc.includes(t)) score += amb ? 0.25 : 1
    }
    if (score >= SOFT_MIN) scored.push({ name, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, max)
}

/** Split into HARD required (score >= STRONG, capped) and SOFT suggested (rest). */
function classify(scored: { name: string; score: number }[], hardCap = 4) {
  let required = scored.filter((s) => s.score >= STRONG).slice(0, hardCap).map((s) => s.name)
  const LEADER = 5
  if (required.length === 0 && scored[0] && scored[0].score >= LEADER) {
    required = [scored[0].name]
  }
  const suggested = scored.filter((s) => !required.includes(s.name)).map((s) => s.name)
  return { required, suggested }
}

function readSkillBody(name: string, maxChars = 2500): string {
  for (const dir of SKILL_DIRS) {
    const p = join(dir, name, "SKILL.md")
    if (existsSync(p)) {
      const body = readFileSync(p, "utf8").trim()
      return body.length > maxChars ? body.slice(0, maxChars) + "\n…[truncated]" : body
    }
  }
  return ""
}

// ---- per-session turn state -------------------------------------------------

type TurnState = { required: string[]; suggested: string[]; loaded: Set<string>; blocked: boolean }
const SESSIONS = new Map<string, TurnState>()
let LAST: TurnState | null = null // fallback bridge chat.message → system.transform

function stateFor(sessionID?: string): TurnState {
  const key = sessionID || "__last__"
  let s = SESSIONS.get(key)
  if (!s) {
    s = { required: [], suggested: [], loaded: new Set(), blocked: false }
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
    // Piece 1: score the incoming user message, arm the turn contract.
    "chat.message": async (_input: any, output: any) => {
      try {
        const parts = output?.parts ?? output?.message?.parts ?? []
        const { required, suggested } = classify(scoreSkills(textFromParts(parts)))
        const s = stateFor(output?.message?.sessionID)
        s.required = required
        s.suggested = suggested
        s.loaded = new Set()
        s.blocked = false
        LAST = s
      } catch {
        // fail open — never break message handling
      }
    },

    // Pieces 1 + 3: inject directive + required + suggested + top-2 skill bodies.
    "experimental.chat.system.transform": async (_input: any, output: any) => {
      try {
        if (!output || typeof output !== "object") return
        const sys: any[] = Array.isArray(output.system) ? output.system : (output.system = [])
        if (sys.some((x) => typeof x === "string" && x.includes(MARKER))) return // idempotent
        const s = LAST
        let block = DIRECTIVE
        if (s && s.required.length > 0) {
          block += `\n\nREQUIRED_SKILLS (strong match — a work tool is blocked until each is loaded):\n  ${s.required.join(", ")}`
        }
        if (s && s.suggested.length > 0) {
          block += `\n\nSUGGESTED_SKILLS (complementary — NOT enforced, but load every one that genuinely helps; combining several is expected):\n  ${s.suggested.join(", ")}`
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
