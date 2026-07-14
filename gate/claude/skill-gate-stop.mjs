#!/usr/bin/env node
/**
 * skill-gate-stop.mjs — Claude Code Stop hook (THE gate).
 *
 * Diffs the deterministic required-set against the skills actually activated
 * this turn. If any are missing it BLOCKS turn-end and tells the model exactly
 * which Skill() calls to make. This is what turns advisory text into a real
 * enforcement loop.
 *
 * Loop safety: enforces at most ONE block per turn. `stop_hook_active` (set by
 * Claude Code when the model resumed *because* of this hook) short-circuits to
 * allow the turn to end, so we never deadlock.
 *
 * W8: the required-set is SHAPE-VALIDATED, not merely JSON-parsed. A corrupt
 * contract like `{"required":"foo"}` parses fine, so a blind `try{JSON.parse}` never
 * fires — and `"foo".filter(...)` then throws an UNCAUGHT TypeError that kills the
 * Stop hook. A wrong-shaped set is now a DIAGNOSED allow (stderr diagnostic + the
 * turn proceeds), never a crash and never a silent one either.
 */

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { gatePaths } from "./skill-gate-lib.mjs";

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 250);
  });
}

function allow() {
  process.exit(0);
}

/** Loud, non-blocking diagnostic. stdout is the harness's control channel — never touch it here. */
function warn(msg) {
  try {
    process.stderr.write(`[GATE WARNING] ${msg}\n`);
  } catch {
    // stderr itself unwritable — nothing more we can do, and we must not throw
  }
}

/** A valid required-set is an array of strings. Anything else is corrupt. */
function isValidRequired(v) {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

const raw = await readStdin();
let j = {};
try {
  j = JSON.parse(raw);
} catch {
  allow();
}

// Already looped once because of us → let it stop, no deadlock.
if (j.stop_hook_active === true) allow();

const p = gatePaths(j.session_id || "default");
if (!existsSync(p.required)) allow();

let required = [];
try {
  const parsed = JSON.parse(readFileSync(p.required, "utf8"));
  const set = parsed?.required;
  if (set === undefined || set === null) {
    // No required-set recorded for this turn — a legitimate, non-corrupt state.
    allow();
  }
  if (!isValidRequired(set)) {
    warn(
      `corrupt required-set at ${p.required} (expected an array of strings, got ${
        Array.isArray(set) ? "an array with non-string entries" : typeof set
      }) — allowing the turn, skill enforcement is INACTIVE this turn.`,
    );
    allow();
  }
  required = set;
} catch (e) {
  warn(`corrupt required-set at ${p.required} (${e?.message ?? String(e)}) — allowing the turn, skill enforcement is INACTIVE this turn.`);
  allow();
}
if (required.length === 0) allow();

const activated = new Set(
  (existsSync(p.activated) ? readFileSync(p.activated, "utf8") : "")
    .split("\n")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

const missing = required.filter((r) => !activated.has(r.toLowerCase()));

// Hard cap: at most one block per turn, even if stop_hook_active is unset.
let blocks = 0;
try {
  blocks = parseInt(readFileSync(p.blocks, "utf8"), 10) || 0;
} catch {
  /* default 0 */
}

if (missing.length === 0 || blocks >= 1) allow();

try {
  writeFileSync(p.blocks, String(blocks + 1));
} catch (e) {
  // Can't persist the block counter → can't guarantee the one-block-per-turn cap →
  // blocking anyway risks a deadlock loop. Degrade LOUDLY instead of silently looping.
  warn(`could not record the block counter (${e?.message ?? String(e)}) — allowing the turn to avoid a deadlock loop.`);
  allow();
}

process.stdout.write(
  JSON.stringify({
    decision: "block",
    reason:
      `SKILL GATE: faltan skills OBLIGATORIAS de este turno sin activar: ${missing.join(", ")}. ` +
      `Activá cada una AHORA con Skill(skill="<nombre>") — en un solo mensaje si son varias — y después terminá. ` +
      `No anuncies que las vas a usar: llamalas de verdad.`,
  }),
);
process.exit(0);
