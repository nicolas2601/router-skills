#!/usr/bin/env node
/**
 * skill-gate-eval.mjs — Claude Code UserPromptSubmit hook.
 *
 * Piece 1 (deterministic contract): scores the prompt, picks the top-K skills,
 * and writes them to the per-session required-set that the Stop gate enforces.
 * Piece 3 (aggressive auto-inject): inlines the top-2 SKILL.md bodies directly
 * into context so the knowledge is present even before any Skill() call.
 *
 * NEVER SILENT (the whole point of this change):
 *   - K4b: the index is BUILT here, before scoring — turn 1 on a fresh install
 *     evaluates real skills instead of scoring against a file nobody wrote yet.
 *   - W6: if that build throws, the thrown message is CAPTURED and surfaced as a
 *     [GATE WARNING]; it is never nulled into "no info, no warning".
 *   - W7: each of the 3 contract writes is guarded — a write failure degrades to a
 *     loud [GATE WARNING] instead of killing the hook mid-way with no output.
 *
 * stdout is injected into the model context as a <system-reminder>. stderr stays
 * empty on the happy path (the harness treats hook stderr as noise).
 */

import { writeFileSync } from "node:fs";
import { scoreSkills, classify, readSkillBody, gatePaths, ensureGateIndex } from "./skill-gate-lib.mjs";

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

// K4b/W6: build the index FIRST. A throw here must never be swallowed into `null` —
// that would disable the very warning this block exists to emit.
let indexInfo = null;
let indexBuildError = null;
try {
  indexInfo = ensureGateIndex();
} catch (e) {
  indexBuildError = e?.message ?? String(e);
}

const warnings = [];
if (indexBuildError) {
  warnings.push(`[GATE WARNING] index build failed: ${indexBuildError} — skill enforcement is INACTIVE this turn.`);
} else if (indexInfo && indexInfo.indexError) {
  warnings.push(`[GATE WARNING] index build failed: ${indexInfo.indexError} — skill enforcement is INACTIVE this turn.`);
} else if (indexInfo && indexInfo.empty) {
  warnings.push(
    "[GATE WARNING] the skill index is EMPTY — no skills installed, so enforcement is INACTIVE. " +
      "Run `router-skills` (or `npx skills add <owner/repo@skill>`) to install some.",
  );
}

const scored = scoreSkills(prompt);
const { required, suggested } = classify(scored);
const p = gatePaths(sessionId);

// W7: the contract writes (HARD set + per-turn trackers) are GUARDED. Unguarded, an
// EISDIR/EACCES/ENOSPC here killed the hook before a single byte of the directive (or
// of the warning above) was printed — a hard crash instead of a visible degradation.
const writeContract = (file, data) => {
  try {
    writeFileSync(file, data);
    return null;
  } catch (e) {
    return e?.message ?? String(e);
  }
};
// Each write is attempted independently (one failing path must not skip the other two),
// and the FIRST error is what gets reported.
const contractErrors = [
  writeContract(p.required, JSON.stringify({ required, ts: Date.now() })),
  writeContract(p.activated, ""),
  writeContract(p.blocks, "0"),
].filter(Boolean);
if (contractErrors.length > 0) {
  warnings.push(`[GATE WARNING] contract not written (${contractErrors[0]}) — enforcement INACTIVE this turn.`);
}

// Always emit the directive so non-matching turns still get the discipline nudge.
let out = DIRECTIVE;

if (warnings.length > 0) out += `\n\n${warnings.join("\n")}`;

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
