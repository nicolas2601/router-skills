/**
 * skill-gate-lib.mjs — shared scorer + path helpers for the skill gate.
 *
 * Deterministic skill matcher: scores a user prompt against the cached skill
 * index (name<TAB>description) and returns the top-K skills. Used by:
 *   - skill-gate-eval.mjs  (UserPromptSubmit): writes the required-set contract
 *   - skill-gate-stop.mjs  (Stop): enforces the contract
 *
 * Pure Node ESM, no deps, cross-platform.
 */

import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HOME = homedir();

export const INDEX_PATH = join(HOME, ".claude", ".router-cache", "skills-index.tsv");
export const GATE_DIR = join(HOME, ".claude", ".skillgate");

// Directories where a skill's SKILL.md may live (first hit wins).
const SKILL_DIRS = [
  join(HOME, ".claude", "skills"),
  join(HOME, ".agents", "skills"),
  join(HOME, ".config", "opencode", "skills"),
];

const STOPWORDS = new Set([
  // EN
  "the", "and", "for", "with", "that", "this", "you", "your", "are", "can",
  "have", "has", "was", "will", "how", "what", "why", "when", "where", "into",
  "from", "then", "than", "not", "but", "all", "any", "get", "use", "using",
  "please", "make", "want", "need", "help", "let", "let's", "lets", "add",
  // ES
  "que", "los", "las", "una", "uno", "por", "con", "para", "como", "esto",
  "esta", "este", "eso", "porque", "pero", "todo", "todos", "toda", "todas",
  "muy", "mas", "más", "hacer", "haz", "hazlo", "quiero", "porfavor", "porfa",
  "favor", "mira", "listo", "ahora", "tambien", "también", "aplica", "aplicas",
  "sabes", "algo", "veo", "correcto", "aca", "acá", "aqui", "aquí", "utiliza",
]);

// Ambient/meta tokens that describe the tooling itself, not the task domain.
// They score at reduced weight so a meta-prompt like "test it in claude code and
// opencode" doesn't force irrelevant skills (claude-code-guide, etc.), while a
// real request ("review my code") still matches via its strong domain tokens.
const AMBIENT = new Set([
  "claude", "code", "opencode", "skill", "skills", "hook", "hooks", "gate",
  "harness", "tool", "tools", "plugin", "plugins", "run", "corre", "corré",
  "prueba", "pruebalo", "pruébalo", "probar", "test", "tests", "testing",
  "instalador", "instaladores", "installer", "install", "funciona", "aplicar",
  "aplicalo", "aplícalo", "harnes", "harneses",
  // URL / VCS chrome — a pasted link must not force domain skills.
  "github", "gitlab", "bitbucket", "com", "http", "https", "www", "git",
  "repo", "repos", "link", "url", "raw", "main", "master", "branch",
]);

// Score at/above which a match is strong enough to HARD-enforce (gate blocks).
// Roughly: two strong name-token hits, or one name hit + solid description
// overlap. Below this a match is only a SOFT suggestion (complement, no block).
export const STRONG = 6;
// Minimum score to surface at all (as a soft suggestion).
export const SOFT_MIN = 3;

export function ensureGateDir() {
  if (!existsSync(GATE_DIR)) mkdirSync(GATE_DIR, { recursive: true });
  return GATE_DIR;
}

export function gatePaths(sessionId) {
  const sid = (sessionId || "default").replace(/[^A-Za-z0-9_-]/g, "_");
  ensureGateDir();
  return {
    required: join(GATE_DIR, `${sid}.required.json`),
    activated: join(GATE_DIR, `${sid}.activated`),
    blocks: join(GATE_DIR, `${sid}.blocks`),
  };
}

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .split(/[^a-z0-9áéíóúñ]+/i)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/** Load the skill index as [{name, desc}]. Returns [] if missing. */
export function loadIndex(indexPath = INDEX_PATH) {
  if (!existsSync(indexPath)) return [];
  const rows = [];
  for (const line of readFileSync(indexPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const tab = line.indexOf("\t");
    const name = (tab === -1 ? line : line.slice(0, tab)).trim();
    const desc = (tab === -1 ? "" : line.slice(tab + 1)).trim().toLowerCase();
    if (name) rows.push({ name, desc });
  }
  return rows;
}

/**
 * Score `prompt` against the index. Returns ALL matches with score >= SOFT_MIN,
 * sorted desc, capped at `max` for safety. Name-token hit = 3, name substring =
 * 1.5, description hit = 1; ambient/meta tokens score a fraction of that.
 */
export function scoreSkills(prompt, { max = 12, indexPath = INDEX_PATH } = {}) {
  const tokens = [...new Set(tokenize(prompt))];
  if (tokens.length === 0) return [];
  const index = loadIndex(indexPath);
  if (index.length === 0) return [];

  const scored = [];
  for (const { name, desc } of index) {
    const nameFlat = name.toLowerCase().replace(/[-_]/g, "");
    const nameTokens = new Set(name.toLowerCase().split(/[-_]/));
    let score = 0;
    for (const t of tokens) {
      const amb = AMBIENT.has(t);
      if (nameTokens.has(t)) score += amb ? 0.5 : 3;
      else if (nameFlat.includes(t)) score += amb ? 0 : 1.5;
      if (desc.includes(t)) score += amb ? 0.25 : 1;
    }
    if (score >= SOFT_MIN) scored.push({ name, desc, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max);
}

/**
 * Split scored matches into the HARD-enforced `required` set and the SOFT
 * `suggested` set (complementary skills — encouraged, never blocked).
 *
 *   required  = strong matches (score >= STRONG). No rigid cap on how many
 *               genuinely-strong skills apply, but bounded at `hardCap` so the
 *               gate can never wedge on a noisy prompt.
 *   suggested = the remaining decent matches — use ALL that complement the task.
 */
export function classify(scored, { hardCap = 4 } = {}) {
  let required = scored.filter((s) => s.score >= STRONG).slice(0, hardCap).map((s) => s.name);
  // If nothing is "strong" but there's a clear dominant leader (score >= LEADER),
  // enforce just that one — a plainly single-domain prompt still gets its skill.
  const LEADER = 5;
  if (required.length === 0 && scored[0] && scored[0].score >= LEADER) {
    required = [scored[0].name];
  }
  const suggested = scored.filter((s) => !required.includes(s.name)).map((s) => s.name);
  return { required, suggested };
}

/** Find and read a skill's SKILL.md body (truncated). "" if not found. */
export function readSkillBody(name, maxChars = 2500) {
  for (const dir of SKILL_DIRS) {
    const p = join(dir, name, "SKILL.md");
    if (existsSync(p)) {
      const body = readFileSync(p, "utf8").trim();
      return body.length > maxChars ? body.slice(0, maxChars) + "\n…[truncated]" : body;
    }
  }
  return "";
}
