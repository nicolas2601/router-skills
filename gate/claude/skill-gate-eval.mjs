#!/usr/bin/env node
/**
 * skill-gate-eval.mjs — Claude Code UserPromptSubmit hook.
 *
 * Piece 1 (deterministic contract): scores the prompt, picks the top-K skills,
 * and writes them to the per-session required-set that the Stop gate enforces.
 * Piece 3 (aggressive auto-inject): inlines the top-2 SKILL.md bodies directly
 * into context so the knowledge is present even before any Skill() call.
 *
 * stdout is injected into the model context as a <system-reminder>.
 */

import { writeFileSync } from "node:fs";
import { scoreSkills, classify, readSkillBody, gatePaths } from "./skill-gate-lib.mjs";

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    // If nothing is piped, don't hang.
    setTimeout(() => resolve(data), 250);
  });
}

const DIRECTIVE = `INSTRUCTION: MANDATORY SKILL EVALUATION (a Stop gate enforces the required set)

Before responding, activate every skill that genuinely helps THIS task. There is
NO limit — if several skills complement each other, activate ALL of them, not a
token few. Activate via Skill() BEFORE writing code or answering. Naming a skill
without calling Skill() is worthless.`;

const raw = await readStdin();
let prompt = "";
let sessionId = "default";
try {
  const j = JSON.parse(raw);
  prompt = j.prompt || j.user_prompt || "";
  sessionId = j.session_id || "default";
} catch {
  prompt = raw; // fallback: raw text
}

const scored = scoreSkills(prompt);
const { required, suggested } = classify(scored);
const p = gatePaths(sessionId);

// Write the contract (HARD set only) + reset the per-turn trackers.
writeFileSync(p.required, JSON.stringify({ required, ts: Date.now() }));
writeFileSync(p.activated, "");
writeFileSync(p.blocks, "0");

// Always emit the directive so non-matching turns still get the discipline nudge.
let out = DIRECTIVE;

if (required.length > 0) {
  out += `\n\nREQUIRED_SKILLS (strong match — the Stop gate BLOCKS turn-end until every one is loaded via Skill()):\n  ${required.join(", ")}`;
}
if (suggested.length > 0) {
  out += `\n\nSUGGESTED_SKILLS (complementary — NOT enforced, but activate every one that genuinely helps; combining several is expected):\n  ${suggested.join(", ")}`;
}

if (required.length > 0 || suggested.length > 0) {
  // Aggressive auto-inject: inline up to 2 bodies (required first) as a floor.
  const order = [...required, ...suggested];
  const injected = [];
  for (const name of order.slice(0, 2)) {
    const body = readSkillBody(name);
    if (body) injected.push(`\n----- AUTO-INJECTED SKILL: ${name} -----\n${body}`);
  }
  if (injected.length > 0) {
    out += `\n\nThese skill bodies are pre-loaded for you (still call Skill() on them so the harness registers them + runs any tooling):\n${injected.join("\n")}`;
  }
}

process.stdout.write(out + "\n");
