/**
 * router-core.mjs — single source of truth for skill/agent routing and gating.
 *
 * Ports `~/.claude/hooks/skill-router.sh` (v3.2) and `~/.claude/hooks/usage-tracker.sh`
 * into cross-platform Node ESM, and unifies them with the pre-existing
 * `gate/claude/skill-gate-lib.mjs` scorer (which drifted from a hand-copied opencode
 * twin). Every fs/env/home/cwd/spawn/clock/path dependency is injectable via `Deps` —
 * nothing in this file reads the real `process.env`, `os.homedir()`, `process.cwd()`,
 * or the real filesystem/network/clock EXCEPT inside `defaultDeps()`, which is the
 * only place those real bindings are touched.
 *
 * Pure Node ESM, no third-party deps, cross-platform (every path builder accepts an
 * injectable `PathImpl` so win32 behaviour is assertable from a posix host).
 *
 * HERMETICITY (W3): every exported function below REQUIRES `deps` explicitly — there is
 * no `deps = defaultDeps()` default anywhere except on `defaultDeps` itself. A default
 * parameter here would let any forgetful caller silently fall through to the real
 * fs/env/homedir/cwd, exactly the footgun `src/paths.ts`'s `opencodeBase` doc-comment
 * warns about. Only the two Claude-hook `main(stdinString, deps = defaultDeps())`
 * entrypoints (`gate/claude/skill-router.mjs`, `gate/claude/skill-usage-tracker.mjs`) and
 * the opencode plugin shell's top-level `defaultDeps()` call are allowed to touch the real
 * bindings — every other caller (including tests) must inject `deps` explicitly.
 *
 * DELIBERATE DEVIATION FROM BASH (W1): `skill-router.sh:281-310` checks `DETECTED_TECH`
 * FIRST and lets it override a HARD/SOFT local match unconditionally. This port instead
 * treats a strong LOCAL index match (HARD/SOFT, computed from the user's own installed
 * skills/agents) as a higher-confidence signal than a keyword-substring guess against the
 * ~50-entry `TECH_KEYWORDS` map, so the tech hint only surfaces in the fallback
 * (HINT/none) branch — see `gate/claude/skill-router.mjs`'s `run()`. Rationale: a mention
 * of "react" inside an otherwise strongly-matched prompt (e.g. "please cache it correctly
 * today with react") should not silently discard a real `[OBLIGATORIO]` match in favor of
 * a generic "go run npx skills find" nudge. Pinned by
 * `src/router-hookio.test.ts`'s "a HARD local match wins over a detected-tech hint (W1)".
 */

import * as nodeFs from "node:fs";
import { homedir as nodeHomedir } from "node:os";
import nodePath from "node:path";
import { spawnSync as nodeSpawnSync } from "node:child_process";
import { createHash } from "node:crypto";

/**
 * @typedef {object} FsLike   subset actually used — a plain object literal satisfies it
 * @property {(p:string)=>boolean} existsSync
 * @property {(p:string,enc:string)=>string} readFileSync
 * @property {(p:string,data:string)=>void} writeFileSync
 * @property {(p:string,data:string)=>void} appendFileSync
 * @property {(p:string,o?:{recursive?:boolean})=>void} mkdirSync
 * @property {(p:string)=>string[]} readdirSync            // names only; NEVER withFileTypes
 * @property {(p:string)=>{isDirectory():boolean,isFile():boolean,mtimeMs:number,size:number}} statSync // FOLLOWS symlinks (skills are links)
 * @property {(p:string,o?:{force?:boolean})=>void} rmSync
 * @property {(from:string,to:string)=>void} renameSync     // POSIX/NTFS-atomic; used for index writes (K4a)
 *
 * @typedef {object} Deps
 * @property {FsLike} fs
 * @property {Record<string,string|undefined>} env
 * @property {string} home        // never os.homedir() inside this module
 * @property {string} cwd         // never process.cwd() inside this module
 * @property {(cmd:string,args:string[],o:object)=>{stdout:string,status:number}} spawn
 * @property {()=>number} now     // ms epoch; frozen in tests
 * @property {import("node:path").PlatformPath} path
 * @property {(msg:string)=>void} warn  // C4: side-channel diagnostic (stderr in prod) for
 *   hooks whose stdout contract must stay empty/unaffected (e.g. skill-usage-tracker.mjs)
 *   — fail-open must never mean fail-SILENT just because stdout can't carry the signal.
 */

/**
 * Real bindings. The ONLY place `node:fs` / `node:os` / `node:path` /
 * `node:child_process` / `node:crypto` are touched in this module.
 * Intentionally NOT unit-tested directly (calling it would read the real
 * `homedir()`, violating the hermetic-test rule) — exercised only indirectly
 * via the hook entrypoints' shims and manual smoke checks.
 * @returns {Deps}
 */
export function defaultDeps() {
  return {
    fs: {
      existsSync: nodeFs.existsSync,
      readFileSync: nodeFs.readFileSync,
      writeFileSync: nodeFs.writeFileSync,
      appendFileSync: nodeFs.appendFileSync,
      mkdirSync: nodeFs.mkdirSync,
      readdirSync: nodeFs.readdirSync,
      statSync: nodeFs.statSync,
      rmSync: nodeFs.rmSync,
      renameSync: nodeFs.renameSync,
    },
    env: process.env,
    home: nodeHomedir(),
    cwd: process.cwd(),
    spawn: nodeSpawnSync,
    now: () => Date.now(),
    path: nodePath,
    warn: (msg) => {
      try {
        process.stderr.write(String(msg) + "\n");
      } catch {
        // stderr itself unwritable — nothing more we can do, must not throw
      }
    },
  };
}

// ============================================================
// P1 — primitives: STOPWORDS / tokenize / bigrams / classify
// ============================================================

// Ported verbatim from `gate/claude/skill-gate-lib.mjs` (L28-40) — the CORRECT,
// complete list (source of truth per AC-5). The opencode-side hand copy this
// change deletes was missing the accented `también`, silently turning a
// `suggested` result into `required` via the LEADER fallback.
export const STOPWORDS = new Set([
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

// K5: ported VERBATIM from `skill-router.sh:138`'s own `STOPWORDS` bash string — a
// DIFFERENT, materially smaller list than the gate's `STOPWORDS` above (e.g. it keeps
// "proyecto", "de", "con", "el", "puedes", "gracias", "dime", "create", "could"/"would"/
// "should" out of scoring, several of which the gate's list does NOT). `scoreRouter`
// (the bash `awk` scoring formula) must tokenize with THIS list — reusing the gate's list
// would let tokens the real bash router treats as noise leak into scoring, silently
// diverging from `skill-router.sh`'s actual output on ordinary prompts.
export const ROUTER_STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "de", "del", "y", "o", "que", "como", "para",
  "por", "con", "sin", "en", "sobre", "es", "son", "este", "esto", "mi", "tu", "su", "se",
  "lo", "le", "me", "te",
  "the", "and", "or", "for", "with", "this", "that", "can", "could", "would", "should",
  "help", "need", "want", "make", "create", "get",
  "puedes", "favor", "please", "thanks", "gracias", "hacer", "dime", "voy", "proyecto",
  "tener", "haria", "vas", "hago", "pasos", "primero", "antes", "empezar",
]);

/** Lowercase, split on non-alnum (incl. Spanish diacritics), drop len<3, drop stopwords.
 * `stopwords` defaults to the GATE's list (`scoreGate`'s caller); `scoreRouter` passes
 * `ROUTER_STOPWORDS` explicitly (K5) — the two scorers intentionally use DIFFERENT
 * stopword sets, matching their respective bash sources. */
export function tokenize(text, stopwords = STOPWORDS) {
  return (text || "")
    .toLowerCase()
    .split(/[^a-z0-9áéíóúñ]+/i)
    .filter((t) => t.length >= 3 && !stopwords.has(t));
}

/** "a_b"-joined adjacent token pairs, order preserved. Pure. */
export function bigrams(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    out.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  return out;
}

// Score at/above which a match is strong enough to HARD-enforce (gate blocks).
export const STRONG = 6;
// Minimum score to surface at all (as a soft suggestion).
export const SOFT_MIN = 3;

/**
 * Split scored matches into the HARD-enforced `required` set and the SOFT
 * `suggested` set. Ported verbatim from `skill-gate-lib.mjs` `classify()` (L137-147).
 *   required  = score >= STRONG, capped at hardCap.
 *   LEADER=5 fallback: if nothing is "strong" but there's a clear dominant leader
 *   (score >= LEADER), enforce just that one.
 */
export function classify(scored, { hardCap = 4 } = {}) {
  let required = scored.filter((s) => s.score >= STRONG).slice(0, hardCap).map((s) => s.name);
  const LEADER = 5;
  if (required.length === 0 && scored[0] && scored[0].score >= LEADER) {
    required = [scored[0].name];
  }
  const suggested = scored.filter((s) => !required.includes(s.name)).map((s) => s.name);
  return { required, suggested };
}

// ============================================================
// P2 — scoring: scoreRouter (skill-router.sh awk math) / scoreGate (skill-gate-lib.mjs math)
// ============================================================

/**
 * EXACT bash math from `skill-router.sh`'s `score_index()` awk block (L156-181).
 * Iterates the FILTERED token array once PER OCCURRENCE (not deduplicated — a
 * token repeated 3x in the prompt contributes its per-occurrence score 3x over,
 * a verbatim bash quirk that MUST be preserved). Returns top-3, desc-sorted,
 * stable on ties (first-inserted wins).
 *
 * Per-token: desc-substring occurrence count (capped at 3) x1, plus name-substring
 * hit x3 (name compared with `-`/`_` replaced by spaces, like the bash `lname`).
 * Per-bigram (independent, additive): desc match +2, name match +2.
 */
/**
 * Whole-word matching.
 *
 * The bash original matched with grep-style substring containment. For long English
 * tokens that is harmless; for short ones it is poison. The Spanish word "mal"
 * ("bad") — which shows up in a great many real prompts — is a substring of
 * "deciMAL", "norMAL", "forMAL", "aniMAL". Junk skills cleared the HARD threshold
 * and got injected as [OBLIGATORIO], spending context on skills unrelated to the task.
 *
 * `\b` in JS is ASCII-only, so it would split on the accents that Spanish prompts are
 * full of ("diseño", "animación"). The boundary is expressed with lookarounds over an
 * explicit Latin-1/Latin-Extended-A word class instead.
 */
const WORD_CHAR = "[A-Za-z0-9\\u00C0-\\u024F]";

function wordPattern(term, flags) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<!${WORD_CHAR})${escaped}(?!${WORD_CHAR})`, flags);
}

export function hasWord(haystack, term) {
  if (!term) return false;
  return wordPattern(term, "").test(haystack);
}

export function countWord(haystack, term, cap = Infinity) {
  if (!term) return 0;
  const matches = haystack.match(wordPattern(term, "g"));
  return matches ? Math.min(matches.length, cap) : 0;
}

export function scoreRouter(prompt, index, _deps) {
  // K5: tokenize with the ROUTER's own stopword list (skill-router.sh:138), NOT the
  // gate's — see the ROUTER_STOPWORDS doc comment above.
  const filtered = tokenize(prompt, ROUTER_STOPWORDS);
  if (filtered.length === 0) return [];
  const bg = bigrams(filtered);

  const rows = [];
  index.forEach((row, insertionIndex) => {
    const desc = (row.desc || "").toLowerCase();
    const lname = row.name.toLowerCase().replace(/[-_]/g, " ");
    let score = 0;

    for (const t of filtered) {
      if (!t) continue;
      // Whole-word, capped at 3 (the awk original capped occurrences the same way).
      score += countWord(desc, t, 3);
      if (hasWord(lname, t)) score += 3;
    }

    for (const pair of bg) {
      if (!pair) continue;
      const spaced = pair.replace(/_/g, " ");
      if (hasWord(desc, spaced)) score += 2;
      if (hasWord(lname, spaced)) score += 2;
    }

    if (score > 0) rows.push({ name: row.name, score, insertionIndex });
  });

  rows.sort((a, b) => b.score - a.score || a.insertionIndex - b.insertionIndex);
  return rows.slice(0, 3).map((r) => ({ name: r.name, score: r.score }));
}

// Ambient/meta tokens that describe the tooling itself, not the task domain.
// Ported verbatim from `skill-gate-lib.mjs` (L46-55).
export const AMBIENT = new Set([
  "claude", "code", "opencode", "skill", "skills", "hook", "hooks", "gate",
  "harness", "tool", "tools", "plugin", "plugins", "run", "corre", "corré",
  "prueba", "pruebalo", "pruébalo", "probar", "test", "tests", "testing",
  "instalador", "instaladores", "installer", "install", "funciona", "aplicar",
  "aplicalo", "aplícalo", "harnes", "harneses",
  // URL / VCS chrome — a pasted link must not force domain skills.
  "github", "gitlab", "bitbucket", "com", "http", "https", "www", "git",
  "repo", "repos", "link", "url", "raw", "main", "master", "branch",
]);

/**
 * EXACT current gate math, moved VERBATIM from `skill-gate-lib.mjs`'s `scoreSkills()`:
 * name-token exact = 3 (0.5 if AMBIENT), name-substring = 1.5 (0 if AMBIENT),
 * desc substring = 1 (0.25 if AMBIENT). Tokens deduplicated via `Set` BEFORE scoring
 * (unlike `scoreRouter`). `opts.minScore` defaults to SOFT_MIN, matching the current
 * `scoreSkills`'s `score >= SOFT_MIN` filter (a lower `minScore` is a test-only knob
 * to inspect the raw pre-filter score).
 */
export function scoreGate(prompt, index, { max = 12, minScore = SOFT_MIN } = {}) {
  const tokens = [...new Set(tokenize(prompt))];
  if (tokens.length === 0) return [];

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
    if (score >= minScore) scored.push({ name, desc, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max);
}

// ============================================================
// P3 — index build / load / needsRebuild / ensureIndex
// ============================================================
//
// NOTE ON PATH BUILDERS: this section duplicates a small subset of the pure path
// logic that also lives (as TypeScript) in `src/paths.ts`. That duplication is
// intentional (see design.md): router-core.mjs must stay self-contained so it can
// be inlined verbatim into the generated opencode plugin — it cannot import a .ts
// file from outside the repo. Every builder here takes `deps` (home + path) rather
// than raw `home`/`p`, matching this module's injectable-deps convention.

function claudeDirOf(deps) {
  return deps.path.join(deps.home, ".claude");
}
function skillsDirOf(deps) {
  return deps.path.join(claudeDirOf(deps), "skills");
}
function agentsDirOf(deps) {
  return deps.path.join(claudeDirOf(deps), "agents");
}
function routerCacheDirOf(deps) {
  return deps.path.join(claudeDirOf(deps), ".router-cache");
}
function skillsIndexPathOf(deps) {
  return deps.path.join(routerCacheDirOf(deps), "skills-index.tsv");
}
function agentsIndexPathOf(deps) {
  return deps.path.join(routerCacheDirOf(deps), "agents-index.tsv");
}
function npxCacheDirOf(deps) {
  return deps.path.join(routerCacheDirOf(deps), "npx-cache");
}
function lastSuggestionPathOf(deps) {
  return deps.path.join(routerCacheDirOf(deps), "last-suggestion.json");
}
function routerStateDirOf(deps) {
  return deps.path.join(routerCacheDirOf(deps), "state");
}

// Public path-builder wrappers (design.md's "paths" export bucket, Modules table).
// P7 hook entrypoints (gate/claude/skill-router.mjs, skill-usage-tracker.mjs) live
// outside this module and need these exact paths to loadIndex()/read/write the same
// files ensureIndex()/adjust()/recordUse() already compute internally. Additive-only
// (no existing export changed) — verified by re-running the full P0-P6 suite (78
// pass, 0 fail) after this addition.
export function skillsIndexPath(deps) {
  return skillsIndexPathOf(deps);
}
export function agentsIndexPath(deps) {
  return agentsIndexPathOf(deps);
}
export function lastSuggestionPath(deps) {
  return lastSuggestionPathOf(deps);
}

/**
 * Suggestion (QA iteration 2): fail-open (never throws), but now RETURNS the error
 * (`null` on success) instead of swallowing it — a mkdir failure here used to surface
 * only as a confusing, misattributed write error one step later.
 */
function ensureDirSafe(deps, dir) {
  try {
    deps.fs.mkdirSync(dir, { recursive: true });
    return null;
  } catch (e) {
    return (e && e.message) || String(e);
  }
}

/**
 * Parse the `description:` frontmatter field, matching the bash `awk` extraction for the
 * common single-line case, PLUS (W6, a deliberate improvement over the bash source — the
 * bash `awk` has the exact same limitation, so this is not a regression) a YAML
 * block-scalar (`description: |`, `|-`, `|+`, `>`, `>-`, `>+`) continuation join: every
 * subsequent indented line is collected and space-joined until indentation ends. Without
 * this, a skill using this extremely common YAML style (confirmed against the real
 * installed `~/.claude/skills/academic-researcher/SKILL.md`) indexes as the literal
 * single-character description `"|"`, silently killing routing for it.
 */
function extractDescription(content) {
  const lines = (content || "").split("\n");
  const idx = lines.findIndex((l) => /^description:/.test(l));
  if (idx === -1) return "";
  let rest = lines[idx].replace(/^description:\s*/, "");

  if (/^[|>][+-]?\s*$/.test(rest.trim())) {
    const collected = [];
    for (let i = idx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === "") {
        collected.push("");
        continue;
      }
      if (/^\s/.test(line)) {
        collected.push(line.trim());
      } else {
        break; // indentation ended -> block scalar is done
      }
    }
    rest = collected.filter(Boolean).join(" ");
  }

  return rest.replace(/"/g, "").trim().toLowerCase();
}

/**
 * K4(a): atomic index write — write to a sibling temp file, then `renameSync` it onto the
 * real path. `rename` is atomic on both POSIX and NTFS, so a reader (skill-gate-eval.mjs
 * via `ensureIndex`) can never observe a torn/partial index mid-write. Returns `null` on
 * success, or a string error message on failure (K3) — NEVER throws.
 *
 * C2: `skill-gate-eval.mjs` and `skill-router.mjs` are TWO SEPARATE PROCESSES wired on the
 * SAME UserPromptSubmit event, and Claude Code runs matching hooks in PARALLEL. A shared
 * `${path}.tmp` name meant process B's write could truncate/rewrite the tmp file process A
 * was about to `renameSync` — `rename` itself is atomic, but the SOURCE it publishes was
 * not race-free, so a torn index could still get published atomically. The tmp name is now
 * unique per call (`pid` + random), and a failed write/rename cleans up its own tmp instead
 * of leaving it orphaned.
 */
function atomicWriteIndex(deps, path, data) {
  const tmp = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    deps.fs.writeFileSync(tmp, data);
    deps.fs.renameSync(tmp, path);
    return null;
  } catch (e) {
    try {
      deps.fs.rmSync(tmp, { force: true });
    } catch {
      // best-effort cleanup; the write/rename error below is what matters
    }
    return (e && e.message) || String(e);
  }
}

// Directory names pruned BEFORE recursion on the agents walk (never opened at all).
const PRUNED_DIR_NAMES = new Set(["node_modules"]);
function isPrunedDirName(name) {
  return PRUNED_DIR_NAMES.has(name) || name.startsWith(".");
}

/**
 * Top-level `<skillsDir>/<name>/SKILL.md` scan only (NFR: no recursion into a skill's
 * internal files). Uses `fs.statSync` (follows symlinks/junctions) — never
 * `lstat`/`dirent.isDirectory` — the exact bash bug (`find` without `-L`) this change
 * fixes. A dangling symlink (statSync throws) is skipped, not crashed. Pure computation,
 * no write — shared by `buildSkillIndex` (writes) and `needsRebuild` (W3: compares this
 * live count against what's currently indexed, to catch deletions mtime can't see).
 */
function computeSkillRows(deps) {
  const dir = skillsDirOf(deps);
  const rows = [];
  let names = [];
  try {
    names = deps.fs.readdirSync(dir);
  } catch {
    names = [];
  }
  for (const name of names) {
    const skillPath = deps.path.join(dir, name);
    let st;
    try {
      st = deps.fs.statSync(skillPath);
    } catch {
      continue; // dangling symlink or race — skip, don't crash
    }
    if (!st.isDirectory()) continue;
    const mdPath = deps.path.join(skillPath, "SKILL.md");
    let mdStat;
    try {
      mdStat = deps.fs.statSync(mdPath);
    } catch {
      continue;
    }
    if (!mdStat.isFile()) continue;
    let content = "";
    try {
      content = deps.fs.readFileSync(mdPath, "utf8");
    } catch {
      continue;
    }
    const desc = extractDescription(content) || name;
    rows.push({ name, desc: desc.toLowerCase() });
  }
  return rows;
}

export function buildSkillIndex(deps) {
  const rows = computeSkillRows(deps);
  const idxPath = skillsIndexPathOf(deps);
  // Suggestion: `ensureDirSafe` used to swallow its own mkdir error, so a subsequent
  // unguarded write threw a misleading ENOENT that hid the REAL root cause (mkdir
  // EACCES/EROFS). Thread the mkdir error into `writeError` first, so `indexError`
  // reports what actually failed.
  const mkdirError = ensureDirSafe(deps, routerCacheDirOf(deps));
  const tsv = rows.map((r) => `${r.name}\t${r.desc}`).join("\n") + (rows.length ? "\n" : "");
  const writeError = mkdirError || atomicWriteIndex(deps, idxPath, tsv);
  return { rows: rows.length, path: idxPath, writeError };
}

/**
 * Recursive `**\/*.md` walk of `agentsDir`, PRUNING `node_modules/` and any
 * dot-prefixed directory BEFORE recursing — those directories are never passed
 * to `readdirSync`/`statSync` at all, not merely filtered out of the result
 * (perf: the bash source's plain `find` walked `skills/playwright/node_modules`
 * — thousands of files on every prompt). Pure computation, no write — shared by
 * `buildAgentIndex` (writes) and `needsRebuild` (W3).
 */
function computeAgentRows(deps) {
  const root = agentsDirOf(deps);
  const rows = [];

  function walk(dir) {
    let names = [];
    try {
      names = deps.fs.readdirSync(dir);
    } catch {
      return;
    }
    for (const name of names) {
      if (isPrunedDirName(name)) continue; // never opened
      const full = deps.path.join(dir, name);
      let st;
      try {
        st = deps.fs.statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      if (st.isFile() && name.toLowerCase().endsWith(".md")) {
        let content = "";
        try {
          content = deps.fs.readFileSync(full, "utf8");
        } catch {
          continue;
        }
        const base = name.replace(/\.md$/i, "");
        const desc = extractDescription(content) || base;
        rows.push({ name: base, desc: desc.toLowerCase() });
      }
    }
  }
  walk(root);
  return rows;
}

export function buildAgentIndex(deps) {
  const rows = computeAgentRows(deps);
  const idxPath = agentsIndexPathOf(deps);
  const mkdirError = ensureDirSafe(deps, routerCacheDirOf(deps));
  const tsv = rows.map((r) => `${r.name}\t${r.desc}`).join("\n") + (rows.length ? "\n" : "");
  const writeError = mkdirError || atomicWriteIndex(deps, idxPath, tsv);
  return { rows: rows.length, path: idxPath, writeError };
}

/** Fail-open TSV loader: malformed lines (no tab, whitespace-only name) are skipped. */
export function loadIndex(idxPath, deps) {
  let content = "";
  try {
    if (!deps.fs.existsSync(idxPath)) return [];
    content = deps.fs.readFileSync(idxPath, "utf8");
  } catch {
    return [];
  }
  const rows = [];
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    const tab = line.indexOf("\t");
    if (tab === -1) continue; // malformed: no tab character
    const name = line.slice(0, tab).trim();
    if (!name) continue; // whitespace-only name
    const desc = line.slice(tab + 1).trim().toLowerCase();
    rows.push({ name, desc });
  }
  return rows;
}

/** Recursive newest .md mtime under `dir`, pruning the same dirs as buildAgentIndex. */
function newestMdMtime(dir, deps) {
  let names;
  try {
    names = deps.fs.readdirSync(dir);
  } catch {
    return -1;
  }
  let max = -1;
  for (const name of names) {
    if (isPrunedDirName(name)) continue;
    const full = deps.path.join(dir, name);
    let st;
    try {
      st = deps.fs.statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      const sub = newestMdMtime(full, deps);
      if (sub > max) max = sub;
    } else if (name.toLowerCase().endsWith(".md")) {
      if (st.mtimeMs > max) max = st.mtimeMs;
    }
  }
  return max;
}

/**
 * `needsRebuild(srcDir, idxPath, deps, kind)` — ported from `skill-router.sh`'s
 * `needs_rebuild()`: an existing-but-empty (`0`-byte) index ALWAYS triggers a
 * rebuild attempt (`[[ ! -s "$idx" ]]`), regardless of mtimes; otherwise a rebuild
 * is needed iff some `.md` file under `srcDir` is newer than the index.
 *
 * W3: mtime alone is blind to DELETIONS — uninstalling a skill/agent never bumps any
 * SURVIVING file's mtime, so nothing here would ever look "newer" and the stale row for
 * the removed entry keeps scoring forever (`skill-gate-eval` would put a no-longer-
 * installed skill in `required`, `readSkillBody` returns "" silently, and the Stop gate
 * blocks the turn demanding a Skill() call that cannot succeed). Fixed by ALSO comparing
 * the currently-installed row count (`kind`: "skill" -> `computeSkillRows`, "agent" ->
 * `computeAgentRows` — the same counting logic each builder uses) against what's actually
 * on disk in the index; any mismatch (shrink OR growth the mtime check somehow missed)
 * triggers a rebuild too.
 */
export function needsRebuild(srcDir, idxPath, deps, kind = "skill") {
  let idxStat;
  try {
    idxStat = deps.fs.statSync(idxPath);
  } catch {
    return true; // missing index -> rebuild
  }
  if (idxStat.size === 0) return true; // empty index -> always rebuild
  const newest = newestMdMtime(srcDir, deps);
  if (newest === -1) return false; // src dir missing / no md files -> nothing to rebuild from
  if (newest > idxStat.mtimeMs) return true;
  const currentRows = (kind === "agent" ? computeAgentRows(deps) : computeSkillRows(deps)).length;
  const indexedRows = loadIndex(idxPath, deps).length;
  return currentRows !== indexedRows;
}

/**
 * Orchestrates the skill + agent index builds: rebuilds only when `needsRebuild`
 * is true, and reports `empty:true` whenever the skills index has zero rows
 * (missing dir, zero valid `SKILL.md` entries, or all dangling symlinks) — the
 * precondition for the P7 loud empty-index warning.
 */
export function ensureIndex(deps) {
  const skillsDir = skillsDirOf(deps);
  const agentsDir = agentsDirOf(deps);
  const skillIdxPath = skillsIndexPathOf(deps);
  const agentIdxPath = agentsIndexPathOf(deps);

  let rebuilt = false;
  // K3: a write failure (EACCES/EROFS/ENOSPC) building either index is captured here,
  // never thrown and never silently dropped — the caller (skill-router.mjs) turns this
  // into a LOUD `[ROUTER WARNING]` instead of degrading to an empty, silent suggestion.
  let indexError = null;

  let skillsExists = false;
  try {
    skillsExists = deps.fs.statSync(skillsDir).isDirectory();
  } catch {
    skillsExists = false;
  }
  if (skillsExists && needsRebuild(skillsDir, skillIdxPath, deps, "skill")) {
    const r = buildSkillIndex(deps);
    rebuilt = true;
    if (r.writeError) indexError = `${r.path}: ${r.writeError}`;
  }

  let agentsExists = false;
  try {
    agentsExists = deps.fs.statSync(agentsDir).isDirectory();
  } catch {
    agentsExists = false;
  }
  if (agentsExists && needsRebuild(agentsDir, agentIdxPath, deps, "agent")) {
    const r = buildAgentIndex(deps);
    rebuilt = true;
    if (r.writeError && !indexError) indexError = `${r.path}: ${r.writeError}`;
  }

  const skills = loadIndex(skillIdxPath, deps);
  const agents = loadIndex(agentIdxPath, deps);
  // Suggestion: `empty` only ever reflected the SKILLS index — an installed-but-empty
  // AGENTS index degraded `[AGENTS]` suggestions to permanent silence with no flag at all
  // to detect it by. `agentsEmpty` makes that state inspectable too.
  return {
    skills: skills.length,
    agents: agents.length,
    rebuilt,
    empty: skills.length === 0,
    agentsEmpty: agents.length === 0,
    indexError,
  };
}

// ============================================================
// P4 — memoryDir (impure wrapper; pure projectSlug/memoryDirs duplicated from
// src/paths.ts on purpose — see the P3 path-builder note above: this module must
// stay self-contained to be inlined into the generated opencode plugin).
// ============================================================

/** Slug = absolute cwd, every non-alnum char -> "-", one-for-one, no collapsing. */
function projectSlugOf(cwd) {
  return cwd.replace(/[^A-Za-z0-9]/g, "-");
}

/** Candidate memory dirs, most-specific first. Pure — mirrors src/paths.ts's memoryDirs. */
function memoryDirsOf(deps) {
  return [
    deps.path.join(claudeDirOf(deps), "projects", projectSlugOf(deps.cwd), "memory"),
    routerStateDirOf(deps),
  ];
}

/**
 * Impure wrapper: picks the first EXISTING `memoryDirsOf` candidate, falling back
 * to the 2nd (`routerStateDir`) when the project-memory dir doesn't exist yet.
 */
export function memoryDir(home, cwd, deps) {
  const d = { ...deps, home, cwd };
  const candidates = memoryDirsOf(d);
  for (const c of candidates) {
    let exists = false;
    try {
      exists = d.fs.existsSync(c);
    } catch {
      exists = false;
    }
    if (exists) return c;
  }
  return candidates[candidates.length - 1];
}

// ============================================================
// P5 — tracker accounting primitives: adjust / recordUse / recordIgnore / shouldIgnore
// ============================================================

function ignoredSkillsPathOf(deps) {
  return deps.path.join(memoryDir(deps.home, deps.cwd, deps), "ignored-skills.md");
}

/** Fail-open JSON read: malformed/missing/unreadable -> `fallback`, never throws. */
/**
 * C3: `JSON.parse` succeeds on `null`/`[]`/`"x"`/`3` — only a THROW falls back to
 * `fallback`. A truncated/corrupt state file containing e.g. `null` used to make this
 * return `null` itself, and the caller's `stats[name]` then threw a TypeError, swallowed
 * by the tracker's blind catch — worse, in `recordIgnore` the ignored-skills.md append had
 * ALREADY happened before that crash, so `clearSuggestion()` never ran and the same
 * suggestion re-appended on every subsequent tool call, cascading into a runaway HARD
 * escalation. Fixed by validating the parsed value is a genuine plain object; anything else
 * (including `null`/arrays/primitives) is treated exactly like unreadable/malformed JSON —
 * discarded, fallback returned, reported via `error` (never surfaced when the file simply
 * doesn't exist yet — that's the normal first-run case, not a corruption).
 */
function readJsonSafe(deps, path, fallback) {
  try {
    if (!deps.fs.existsSync(path)) return { value: fallback, error: null };
    const raw = deps.fs.readFileSync(path, "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      const kind = parsed === null ? "null" : Array.isArray(parsed) ? "array" : typeof parsed;
      return { value: fallback, error: `${path}: corrupt state (expected an object, got ${kind}) — discarded` };
    }
    return { value: parsed, error: null };
  } catch (e) {
    return { value: fallback, error: `${path}: unreadable/invalid JSON (${(e && e.message) || String(e)}) — discarded` };
  }
}

/**
 * `adjust(name, base, deps)` — ported from `skill-router.sh`'s `adjust()`: `+2`
 * when `<memoryDir>/ignored-skills.md` has `>= 3` lines starting with
 * `"<name> |"`, else `+0`. Fail-open (AC-14): an unreadable/missing file defaults
 * the bump to `0`, never throws.
 */
export function adjust(name, base, deps) {
  const path = ignoredSkillsPathOf(deps);
  let content = "";
  try {
    if (!deps.fs.existsSync(path)) return base;
    content = deps.fs.readFileSync(path, "utf8");
  } catch {
    return base; // fail-open
  }
  const needle = `${name} |`;
  const count = content.split("\n").filter((line) => line.startsWith(needle)).length;
  return count >= 3 ? base + 2 : base;
}

/** Increments `tool-stats.json[name].used` by 1 (creates the entry if absent). */
/**
 * C4: increments `tool-stats.json[name].used`. NEVER throws — a write failure
 * (EACCES/EROFS/ENOSPC) is caught and returned as an error string (`null` on success) so
 * the caller (skill-usage-tracker.mjs's `main`) can surface a `[TRACKER WARNING]` instead
 * of letting it die inside a blind catch with zero signal.
 */
export function recordUse(name, deps) {
  const memDir = memoryDir(deps.home, deps.cwd, deps);
  const path = deps.path.join(memDir, "claude-tool-stats.json");
  const { value: stats, error: readError } = readJsonSafe(deps, path, {});
  const entry = stats[name] || { used: 0, ignored: 0 };
  stats[name] = { ...entry, used: (entry.used || 0) + 1 };
  ensureDirSafe(deps, memDir);
  try {
    deps.fs.writeFileSync(path, JSON.stringify(stats));
    return readError;
  } catch (e) {
    return [readError, `${path}: ${(e && e.message) || String(e)}`].filter(Boolean).join("; ");
  }
}

/**
 * Appends `"<name> | <iso-ts> | <score> | <kind> | <snippet>"` to
 * `ignored-skills.md` (iso-ts from `deps.now()`, never `Date.now()`), increments
 * `tool-stats.json[name].ignored`, truncates `promptSnippet` to 100 chars.
 *
 * C3/C4: NEVER throws. The append happens first (matching the original ordering — the
 * caller's `clearSuggestion()` must still run afterward regardless), and every write is
 * individually guarded so a failure anywhere in this function surfaces as a returned error
 * string instead of an uncaught exception that would leave the caller's suggestion-clear
 * step unreached.
 */
export function recordIgnore(name, score, kind, promptSnippet, deps) {
  const memDir = memoryDir(deps.home, deps.cwd, deps);
  const ignoredPath = deps.path.join(memDir, "ignored-skills.md");
  const statsPath = deps.path.join(memDir, "claude-tool-stats.json");
  ensureDirSafe(deps, memDir);

  const iso = new Date(deps.now()).toISOString();
  const snippet = (promptSnippet || "").slice(0, 100);
  const line = `${name} | ${iso} | ${score} | ${kind} | ${snippet}\n`;
  let appendError = null;
  try {
    deps.fs.appendFileSync(ignoredPath, line);
  } catch (e) {
    appendError = `${ignoredPath}: ${(e && e.message) || String(e)}`;
  }

  const { value: stats, error: readError } = readJsonSafe(deps, statsPath, {});
  const entry = stats[name] || { used: 0, ignored: 0 };
  stats[name] = { ...entry, ignored: (entry.ignored || 0) + 1 };
  try {
    deps.fs.writeFileSync(statsPath, JSON.stringify(stats));
    return [appendError, readError].filter(Boolean).join("; ") || null;
  } catch (e) {
    return [appendError, readError, `${statsPath}: ${(e && e.message) || String(e)}`].filter(Boolean).join("; ");
  }
}

// Tools whose completion can count as "ignored the suggestion" — mirrors
// usage-tracker.sh's `^(Bash|Edit|Write|Read|Grep|Glob)$` whitelist.
const IGNORE_ELIGIBLE_TOOLS = new Set(["Bash", "Edit", "Write", "Read", "Grep", "Glob"]);
const IGNORE_AFTER_MS = 30_000;

/**
 * Pure predicate: `{skill, agent}` independently — a suggestion can log an
 * ignored skill and NOT an ignored agent, or vice versa. Requires >30s elapsed,
 * `toolName` in the tracked whitelist, and the respective score `>= SOFT_MIN`.
 */
export function shouldIgnore(nowMs, suggestion, toolName) {
  // Suggestion (QA iteration 2): `nowMs - suggestion.ts` is `NaN` whenever `ts` is
  // missing/non-numeric, and `NaN > IGNORE_AFTER_MS` is ALWAYS `false` — silently
  // disabling ignore-tracking FOREVER for that suggestion, with zero error/warning. A
  // missing/invalid `ts` is treated as "old enough" (elapsed = Infinity), not "never old
  // enough".
  const ts = suggestion && suggestion.ts;
  const elapsed = Number.isFinite(ts) ? nowMs - ts : Infinity;
  const eligible = IGNORE_ELIGIBLE_TOOLS.has(toolName) && elapsed > IGNORE_AFTER_MS;
  return {
    skill: eligible && (suggestion.skill_score || 0) >= SOFT_MIN,
    agent: eligible && (suggestion.agent_score || 0) >= SOFT_MIN,
  };
}

// ============================================================
// P6 — detectTech + npx-find (default OFF, injected spawn)
// ============================================================

// Ported verbatim from `~/.claude/hooks/skill-router.sh` (L71-124, ~50 entries).
// NOTE: bash associative-array iteration order is undefined/hash-based, so this
// port (a JS `Map`, which IS insertion-ordered) makes a previously non-deterministic
// behaviour deterministic — an intentional, spec-compatible design decision, not a
// regression.
export const TECH_KEYWORDS = new Map([
  ["laravel", "laravel"],
  ["symfony", "symfony"],
  ["react", "react"],
  ["nextjs", "next.js"],
  ["next.js", "next.js"],
  ["vue", "vue"],
  ["nuxt", "nuxt"],
  ["svelte", "svelte"],
  ["angular", "angular"],
  ["django", "django"],
  ["flask", "flask"],
  ["fastapi", "fastapi"],
  ["rails", "rails"],
  ["ruby on rails", "rails"],
  ["spring", "spring"],
  ["express", "express"],
  ["nestjs", "nestjs"],
  ["expo", "expo"],
  ["react native", "react native"],
  ["flutter", "flutter"],
  ["swift", "swift"],
  ["swiftui", "swiftui"],
  ["kotlin", "kotlin"],
  ["solidity", "solidity"],
  ["rust", "rust"],
  ["golang", "golang"],
  ["go", "golang"],
  ["unity", "unity"],
  ["unreal", "unreal"],
  ["godot", "godot"],
  ["wordpress", "wordpress"],
  ["drupal", "drupal"],
  ["medusa", "medusa"],
  ["shopify", "shopify"],
  ["stripe", "stripe"],
  ["supabase", "supabase"],
  ["firebase", "firebase"],
  ["prisma", "prisma"],
  ["tailwind", "tailwind"],
  ["nativewind", "nativewind"],
  ["remotion", "remotion"],
  ["playwright", "playwright"],
  ["cypress", "cypress"],
  ["jest", "jest"],
  ["pytest", "pytest"],
  ["docker", "docker"],
  ["kubernetes", "kubernetes"],
  ["terraform", "terraform"],
  ["vercel", "vercel"],
  ["netlify", "netlify"],
  ["aws", "aws"],
  ["gcp", "gcp"],
]);

/** First-match-wins (insertion order) tech-keyword detector. "" when none match. */
export function detectTech(promptLower) {
  const lower = (promptLower || "").toLowerCase();
  for (const [keyword, tech] of TECH_KEYWORDS) {
    if (lower.includes(keyword)) return tech;
  }
  return "";
}

const NPX_CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const NPX_TIMEOUT_MS = 5000; // 5s

// W2: glyphs used by the `npx skills find` ASCII banner — stripped like the bash
// pipeline's `grep -v '█\|╔\|╗\|╚\|╝\|║\|═'`.
const NPX_BANNER_RE = /[█╔╗╚╝║═]/;
// eslint-disable-next-line no-control-regex -- intentional: strips ANSI SGR sequences.
const ANSI_RE = /\x1b\[[0-9;]*m/g;

/**
 * W2: sanitize raw `npx skills find` stdout before it EVER reaches the cache or the
 * model's context — mirrors the bash source's own pipeline exactly: cap the SOURCE at
 * 2500 chars, strip ANSI color codes, keep at most 20 lines, drop the ASCII banner +
 * blank lines, then cap at 15 lines. Untreated, this was (a) unbounded context bloat and
 * (b) a prompt-injection surface: arbitrary text from an external registry entering the
 * model's context looking like an instruction, not quoted data.
 */
export function sanitizeNpxOutput(raw) {
  const capped = (raw || "").slice(0, 2500);
  const noAnsi = capped.replace(ANSI_RE, "");
  const first20 = noAnsi.split("\n").slice(0, 20);
  const noBannerNoBlank = first20.filter((l) => l.trim() !== "" && !NPX_BANNER_RE.test(l));
  return noBannerNoBlank.slice(0, 15).join("\n");
}

/**
 * `npx skills find <tech>` — OFF by default, opt-in via `SKILLFORGE_NPX_FIND=1`.
 * Cache key = `sha256(tech)` (node:crypto, not the bash source's `md5sum`) under
 * `npxCacheDir`, 1h TTL via the injected clock.
 *
 * K2: `deps.spawn` is (and always was) `spawnSync`-shaped — a SYNCHRONOUS call that
 * blocks the event loop. `spawnSync` silently IGNORES an `AbortSignal`-shaped `signal`
 * option (only the async `spawn`/`exec` APIs honour it), and a `setTimeout` scheduled to
 * fire the abort NEVER RUNS because the event loop is blocked by the synchronous call
 * itself. A cold `npx --yes skills find <tech>` (package download) would therefore hang
 * the `UserPromptSubmit` hook indefinitely — verified empirically: `spawnSync('sleep',
 * ['2'], {signal: <aborted after 300ms>})` still takes ~2000ms and exits status 0. Fixed
 * by using `spawnSync`'s OWN `timeout`/`killSignal` options, which the underlying syscall
 * actually enforces — the bash source had the equivalent `timeout 10 npx ...`.
 *
 * Fail-open on any throw (timeout, missing binary, etc.) -> `""`, never hangs or crashes
 * the prompt.
 */
export function npxFind(tech, deps) {
  if (deps.env.SKILLFORGE_NPX_FIND !== "1") return "";

  const cacheDir = npxCacheDirOf(deps);
  const key = createHash("sha256").update(tech).digest("hex");
  const cacheFile = deps.path.join(cacheDir, key);

  let cacheStat = null;
  try {
    cacheStat = deps.fs.statSync(cacheFile);
  } catch {
    cacheStat = null;
  }
  if (cacheStat && deps.now() - cacheStat.mtimeMs < NPX_CACHE_TTL_MS) {
    try {
      return deps.fs.readFileSync(cacheFile, "utf8");
    } catch {
      // fall through and re-fetch on an unreadable cache entry
    }
  }

  let result;
  try {
    result = deps.spawn("npx", ["--yes", "skills", "find", tech], {
      timeout: NPX_TIMEOUT_MS,
      killSignal: "SIGKILL",
      encoding: "utf8",
    });
  } catch {
    return ""; // fail-open: timeout kill/throw -> "tech detected, no results" branch
  }

  // F2: `spawnSync` does NOT throw when the binary itself is missing — it returns
  // `{error: Error{code:'ENOENT'}, status: null, stdout: null}`. Left unhandled, that fell
  // through to the SAME "" return as a genuine `{error: undefined, status: 0, stdout: ""}`
  // ("npx ran fine, found nothing") — byte-identical, with no signal at all, unlike every
  // other degraded path in this function (timeout, non-zero status: both fail open to ""
  // too, but this is the one case where the failure mode itself — "npx isn't even on
  // PATH" — is worth a distinct, loud diagnostic). Never cached either way.
  if (result && result.error && result.error.code === "ENOENT") {
    deps.warn("npx not found on PATH — skill discovery unavailable");
    return "";
  }

  // W2: `spawnSync` does NOT throw on timeout/failure — it returns `{error, status, stdout}`
  // with a possibly non-empty PARTIAL stdout (a killed process's buffered output so far).
  // Pre-fix, only `result.stdout` truthiness was checked, so a timed-out or failed `npx`
  // yielded partial garbage that got sanitized, CACHED for 1h, and injected into the
  // model's context inside the EXTERNAL DATA fence as if it were a genuine result.
  if (result && (result.error || (typeof result.status === "number" && result.status !== 0))) {
    return "";
  }

  const raw = (result && result.stdout) || "";
  if (!raw) return "";
  const clean = sanitizeNpxOutput(raw);
  if (!clean) return "";

  ensureDirSafe(deps, cacheDir);
  try {
    deps.fs.writeFileSync(cacheFile, clean);
  } catch {
    // caching is best-effort; not fatal
  }
  return clean;
}
