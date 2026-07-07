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
  required = JSON.parse(readFileSync(p.required, "utf8")).required || [];
} catch {
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

writeFileSync(p.blocks, String(blocks + 1));
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
