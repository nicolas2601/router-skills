#!/usr/bin/env node
/**
 * skill-gate-track.mjs — Claude Code PostToolUse hook (matcher: Skill).
 *
 * Records every Skill() activation into the per-session activated file so the
 * Stop gate can diff required vs activated. Never blocks — pure bookkeeping.
 *
 * W9: the JSON.parse and the appendFileSync have SEPARATE catches. One blind catch
 * around both meant a failed append (EISDIR/EACCES/ENOSPC) was indistinguishable
 * from malformed stdin — and a silently-dropped activation makes the Stop gate later
 * accuse the model of never loading a skill it genuinely DID load. A malformed stdin
 * payload stays silent (nothing was ever going to be recorded, so there is nothing to
 * diagnose); a WRITE failure is loud on stderr.
 */

import { appendFileSync } from "node:fs";
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

const raw = await readStdin();

let j = null;
try {
  j = JSON.parse(raw);
} catch {
  // Malformed stdin: no activation was ever going to be recorded. Genuinely nothing
  // to diagnose — stay silent (asserted by a dedicated regression test).
  process.exit(0);
}

try {
  if (j?.tool_name === "Skill") {
    const skill = j.tool_input?.skill || j.tool_input?.name || "";
    if (skill) {
      const p = gatePaths(j.session_id || "default");
      appendFileSync(p.activated, String(skill).trim() + "\n");
    }
  }
} catch (e) {
  // A dropped activation is NOT harmless: the Stop gate will block the turn and tell the
  // model it never loaded a skill it actually did. Never fail silently here.
  try {
    process.stderr.write(`[GATE WARNING] could not record skill activation: ${e?.message ?? String(e)}\n`);
  } catch {
    // stderr itself unwritable — nothing more we can do, and we must not throw
  }
}

process.exit(0);
