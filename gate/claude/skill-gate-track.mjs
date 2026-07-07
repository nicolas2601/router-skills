#!/usr/bin/env node
/**
 * skill-gate-track.mjs — Claude Code PostToolUse hook (matcher: Skill).
 *
 * Records every Skill() activation into the per-session activated file so the
 * Stop gate can diff required vs activated. Never blocks — pure bookkeeping.
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
try {
  const j = JSON.parse(raw);
  if (j.tool_name === "Skill") {
    const skill = j.tool_input?.skill || j.tool_input?.name || "";
    if (skill) {
      const p = gatePaths(j.session_id || "default");
      appendFileSync(p.activated, String(skill).trim() + "\n");
    }
  }
} catch {
  /* ignore malformed input */
}
process.exit(0);
