#!/usr/bin/env node
/**
 * gen-templates.mjs — regenerate src/templates.ts from the gate/ source files.
 *
 * The single-file compiled binary can't read gate/ at runtime, so the hook +
 * plugin sources are inlined into templates.ts as string constants. We embed
 * them with JSON.stringify (bullet-proof escaping) instead of hand-escaped
 * template literals. Run after editing anything under gate/:
 *   node scripts/gen-templates.mjs           # write src/templates.ts
 *   node scripts/gen-templates.mjs --check   # CI guard: fail if it's stale
 *
 * PLUGIN_TS is COMPOSED, not read verbatim: the opencode plugin is
 * `deExport(gate/core/router-core.mjs)` (the ONE shared scorer, with its `export`
 * keywords stripped) + `gate/opencode/skill-enforcer.template.ts` (the plugin shell,
 * which deliberately declares none of those identifiers itself). That composition IS
 * the dedup — it is what makes a drifted, hand-copied second scorer impossible to
 * reintroduce.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Normalise CRLF -> LF. Without a `.gitattributes`, a Windows checkout with
 * `core.autocrlf=true` lands the `gate/**` sources with CRLF line endings, and
 * `JSON.stringify`-embedding them verbatim would make `computeTemplates()` byte-diverge
 * from the LF output committed from a Linux/macOS checkout — a real drift the
 * `gen --check` guard then (correctly) flags as stale, even though nothing under gate/
 * actually changed. Normalising at read time makes the generated output byte-stable
 * REGARDLESS of how the repo was checked out, closing the whole class of bug rather than
 * relying on git config (belt-and-suspenders alongside `.gitattributes`).
 */
export function normalizeEol(src) {
  return src.replace(/\r\n/g, "\n");
}

/** Read a `gate/`-relative source, normalised. `root` is injectable so tests can point
 *  this at a scratch tree without touching the real repo (see gen-templates CRLF test). */
const read = (p, root = ROOT) => normalizeEol(readFileSync(join(root, p), "utf8"));

const ROUTER_CORE_SRC = "gate/core/router-core.mjs";
const LEXICON_SRC = "gate/core/lexicon.mjs";
const PLUGIN_SHELL_SRC = "gate/opencode/skill-enforcer.template.ts";

/**
 * Strip ESM `export` keywords so a module's declarations can be INLINED into another
 * module's scope. Handles the forms router-core.mjs actually uses (`export function`,
 * `export const`) plus the other declaration keywords + `export default` / `export {…}`
 * defensively, so a future edit to router-core can't silently emit a broken plugin.
 */
export function deExport(src) {
  return src
    .replace(/^export\s+default\s+.*$/gm, "")
    .replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, "")
    .replace(/^export\s+(?=(?:async\s+)?(?:function|const|let|var|class)\b)/gm, "");
}

/** Compose the shipped opencode plugin: the shared scorer inlined + the plugin shell.
 *  `root` is injectable so tests can point this at a scratch tree (see gen-templates
 *  CRLF test) without touching the real repo. */
export function composePluginTs(root = ROOT) {
  const core = read(ROUTER_CORE_SRC, root);
  const shell = read(PLUGIN_SHELL_SRC, root);

  // Generate-time guards — the shell must stay a SHELL. If either fires, the shell has
  // started re-declaring what the inlined core already owns, and the composition would
  // produce a duplicate-identifier (or, worse, a silently-drifting) plugin.
  if (/\bfrom\s+["']node:/.test(shell)) {
    throw new Error(
      `${PLUGIN_SHELL_SRC}: must not import from "node:*" — the inlined router-core already owns those imports.`,
    )
  }
  if (/\bimport\b[^;\n]*\brouter-core/.test(shell)) {
    throw new Error(`${PLUGIN_SHELL_SRC}: must not import router-core — it is inlined at generate time.`)
  }

  // The opencode plugin is ONE flat file, so router-core's `./lexicon.mjs` import cannot
  // survive inlining — it would resolve against the plugins dir and blow up at load. Inline
  // the lexicon ahead of the core and drop the import line.
  const lexicon = read(LEXICON_SRC, root);
  const coreInlined = deExport(core).replace(/^import\s[^;\n]*\.\/lexicon\.mjs["'];?\s*$/gm, "");

  if (/\bfrom\s+["']\.\/lexicon\.mjs["']/.test(coreInlined)) {
    throw new Error(
      `${ROUTER_CORE_SRC}: a ./lexicon.mjs import survived inlining — the plugin would fail to load.`,
    )
  }

  return `${deExport(lexicon)}\n\n${coreInlined}\n\n${shell}`;
}

/** Build the `{ NAME: () => content }` map for a given root. Lazy — building the map
 *  never reads a file, only calling a loader does. */
function buildConsts(root) {
  return {
    ROUTER_CORE_MJS: () => read("gate/core/router-core.mjs", root),
    LEXICON_MJS: () => read("gate/core/lexicon.mjs", root),
    GATE_LIB_MJS: () => read("gate/claude/skill-gate-lib.mjs", root),
    GATE_EVAL_MJS: () => read("gate/claude/skill-gate-eval.mjs", root),
    GATE_TRACK_MJS: () => read("gate/claude/skill-gate-track.mjs", root),
    GATE_STOP_MJS: () => read("gate/claude/skill-gate-stop.mjs", root),
    SKILL_ROUTER_MJS: () => read("gate/claude/skill-router.mjs", root),
    USAGE_TRACKER_MJS: () => read("gate/claude/skill-usage-tracker.mjs", root),
    PLUGIN_TS: () => composePluginTs(root),
    SKILL_RULE_MD: () => read("gate/opencode/skill-enforcement.md", root),
  };
}

export const CONSTANT_COUNT = Object.keys(buildConsts(ROOT)).length;

/**
 * The full `src/templates.ts` file content, computed IN MEMORY (no fs write) so both the
 * CLI and the drift test can call it. The drift test asserting
 * `computeTemplates() === readFileSync("src/templates.ts")` is what makes "edited gate/,
 * forgot `bun run gen`" a CI failure instead of a silently-shipped stale scorer.
 *
 * `root` is injectable (default: the real repo root) so tests can point this at a scratch
 * tree — e.g. a CRLF twin of gate/ — without touching or mutating the real repo.
 */
export function computeTemplates(root = ROOT) {
  let out = `/**
 * Inlined enforcement templates — AUTO-GENERATED by scripts/gen-templates.mjs.
 * Do NOT edit by hand. Edit the sources under gate/ and re-run the generator.
 * Embedded via JSON.stringify so the compiled single-file binary needs no assets.
 */

`;
  for (const [name, load] of Object.entries(buildConsts(root))) {
    out += `export const ${name} = ${JSON.stringify(load())}\n\n`;
  }
  return out;
}

function main() {
  const target = join(ROOT, "src/templates.ts");
  const computed = computeTemplates();
  const check = process.argv.slice(2).includes("--check");

  if (check) {
    let committed = "";
    try {
      committed = readFileSync(target, "utf8");
    } catch {
      committed = "";
    }
    if (committed !== computed) {
      console.error(
        "gen-templates --check: src/templates.ts is STALE relative to gate/ sources — run `bun run gen` and commit the result.",
      );
      process.exit(1);
    }
    console.log(`gen-templates --check: templates.ts is up to date (${CONSTANT_COUNT} constants).`);
    process.exit(0);
  }

  writeFileSync(target, computed);
  console.log(`templates.ts regenerated from gate/ (${CONSTANT_COUNT} constants)`);
}

// Only run the CLI when invoked directly — importing this module (the drift test, the
// opencode runtime test) must never write to disk or call process.exit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
