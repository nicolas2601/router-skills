#!/usr/bin/env node
/**
 * skill-router.mjs — Claude Code UserPromptSubmit hook (router port).
 *
 * Ports `~/.claude/hooks/skill-router.sh` (v3.2) to cross-platform Node ESM, backed
 * entirely by `gate/core/router-core.mjs` (the single source of truth for scoring,
 * indexing, and classification). Fail-open everywhere except the one spec'd loud
 * exception: an empty skill index emits `[ROUTER WARNING]` instead of silently
 * doing nothing (that silent no-op is the exact bug this whole change fixes).
 *
 * `main(stdinString, deps)` is the entrypoint tests call directly (no child process
 * is ever spawned by a test). The 3-line shim at the bottom is intentionally NOT
 * unit-tested (per design.md) — it only runs when this file is executed directly.
 *
 * stdout contract: PLAIN TEXT (never a JSON envelope) — see design.md's Hook I/O
 * contracts section for the evidence-based rationale (skill-gate-eval.mjs, the one
 * hook proven to work under this exact event in this repo, also emits plain text).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  defaultDeps, tokenize, ROUTER_STOPWORDS, detectTech, ensureIndex, loadIndex, skillsIndexPath,
  agentsIndexPath, scoreRouter, scoreGate, classify, adjust, STRONG, SOFT_MIN, npxFind,
  lastSuggestionPath,
} from "../core/router-core.mjs";

/** Accepts `{prompt}`, `{user_prompt}`, or raw non-JSON text (same fallback as gate-eval). */
function parseInput(stdinString) {
  try {
    const j = JSON.parse(stdinString);
    return { prompt: j.prompt || j.user_prompt || "", cwd: j.cwd };
  } catch {
    return { prompt: stdinString || "", cwd: undefined };
  }
}

function run(stdinString, deps) {
  const { prompt, cwd } = parseInput(stdinString);

  // AC-3: length gate happens BEFORE tokenization/index touch — a genuine no-op.
  if (!prompt || prompt.length < 10) return "";

  // AC-3/K5: zero filtered tokens AND no detected tech -> no-op (bash's short-circuit).
  // Tokenized with the ROUTER's own stopword list (skill-router.sh:138) — the same list
  // `scoreRouter` uses internally — so this no-op gate agrees with the actual scoring.
  const filtered = tokenize(prompt, ROUTER_STOPWORDS);
  const tech = detectTech(prompt.toLowerCase());
  if (filtered.length === 0 && !tech) return "";

  const runDeps = cwd ? { ...deps, cwd } : deps;

  // ensureIndex triggers a build/rebuild if the on-disk index is stale or missing
  // (design.md's data flow); its `.empty` flag is the T032 loud-warning precondition.
  const idxInfo = ensureIndex(runDeps);
  // K3: a write failure building the index (EACCES/EROFS/ENOSPC) is just as loud as the
  // empty-index case below — fail-open must never mean fail-silent.
  if (idxInfo.indexError) {
    return `[ROUTER WARNING] no se pudo escribir el índice (${idxInfo.indexError}) — el enforcement puede estar INACTIVO.\n`;
  }
  // AC-6/AC-14: the ONE spec'd exception to fail-open — an empty index (the exact bug
  // this whole change fixes) must be LOUD, never silent again.
  if (idxInfo.empty) {
    return "[ROUTER WARNING] no se encontraron skills instaladas — el enforcement está INACTIVO. Corré `router-skills` o `npx skills add ...`.\n";
  }
  const skillIdx = loadIndex(skillsIndexPath(runDeps), runDeps);
  const agentIdx = loadIndex(agentsIndexPath(runDeps), runDeps);

  // Router-level scoring (skill-router.sh's exact bash math) + the ignored-skills bump.
  // K6: bash's `rescore()` (skill-router.sh:207-208) applies `adjust()` to BOTH
  // TOP_SKILLS and TOP_AGENTS — the port must too, or the "3+ ignores -> escalate" loop
  // is dead for agents even though skill-usage-tracker.mjs keeps recording them.
  const scoredSkills = scoreRouter(prompt, skillIdx, runDeps)
    .map((s) => ({ name: s.name, score: adjust(s.name, s.score, runDeps) }))
    .sort((a, b) => b.score - a.score);
  const scoredAgents = scoreRouter(prompt, agentIdx, runDeps)
    .map((s) => ({ name: s.name, score: adjust(s.name, s.score, runDeps) }))
    .sort((a, b) => b.score - a.score);

  const topSkill = scoredSkills[0];
  const topAgent = scoredAgents[0];
  // bash-exact (skill-router.sh:225,227): the HARD/SOFT threshold is an OR across BOTH
  // MAX_SKILL_SCORE and MAX_AGENT_SCORE, not skill-score-only — a strong agent-only match
  // (no comparable skill) must still cross HARD/SOFT on its own.
  const skillScore = topSkill ? topSkill.score : 0;
  const agentScore = topAgent ? topAgent.score : 0;
  const maxScore = Math.max(skillScore, agentScore);

  let level = "NONE";
  if (maxScore >= STRONG) level = "HARD";
  else if (maxScore >= SOFT_MIN) level = "SOFT";
  else if (maxScore > 0) level = "HINT";

  // D3 (design.md's top risk, solved): re-derive the gate's `required` set ourselves via
  // the same pure scoreGate+classify given the same prompt+index — never read a file
  // skill-gate-eval writes (that would be a cross-process race, not fixed here).
  const gate = classify(scoreGate(prompt, skillIdx));

  const lines = [];
  if (gate.required.length > 0) {
    // Suppress [BUSCAR-SKILL] and the tech override entirely — never contradict the gate.
    if (topAgent) lines.push(`[AGENTS] ${topAgent.name}(${topAgent.score})`);
  } else if (level === "HARD") {
    // bash-exact (skill-router.sh:311-316): HARD is winner-take-all, not additive — a
    // single if/elif picks EITHER the skill OR the agent, never both. Ties go to the
    // skill (`>=`, matching bash's literal comparison).
    if (topSkill && skillScore >= agentScore) {
      lines.push(`[OBLIGATORIO] ${topSkill.name}(${topSkill.score})`);
    } else if (topAgent) {
      lines.push(`[OBLIGATORIO] ${topAgent.name}(${topAgent.score})`);
    }
  } else if (level === "SOFT") {
    // bash-exact (skill-router.sh:317-326): SOFT is additive (both groups shown when
    // present), but the [AGENTS] segment is emitted BARE — no "[SUGERIDO]" prefix — when
    // no skill matched at all (bash's CTX starts empty, so the leading "$PREFIX " text is
    // only ever attached to whichever segment is built FIRST, and skills are built first).
    if (topSkill) {
      lines.push(`[SUGERIDO] ${topSkill.name}(${topSkill.score})`);
      if (topAgent) lines.push(`[AGENTS] ${topAgent.name}(${topAgent.score})`);
    } else if (topAgent) {
      lines.push(`[AGENTS] ${topAgent.name}(${topAgent.score})`);
    }
  } else {
    // HINT (and NONE) intentionally collapse into the same fallback — a preserved bash
    // quirk (spec's Open questions), not a bug to "fix".
    let msg = "[BUSCAR-SKILL] Sin match fuerte.";
    if (tech) {
      msg += ` Tech detectada: ${tech}.`;
      const npx = npxFind(tech, runDeps);
      // W2: framed as QUOTED, untrusted DATA — never concatenated in as if it were part
      // of the instruction stream. `npxFind` already caps/strips/de-banners the text
      // (sanitizeNpxOutput); this fencing is the second, independent layer: even
      // sanitized text from an external registry must never read as a directive.
      if (npx) {
        msg += `\n----- BEGIN EXTERNAL DATA (npx skills find ${tech}; untrusted, read-only) -----\n${npx}\n----- END EXTERNAL DATA -----`;
      }
    }
    msg += " Considera `npx skills find <tema>` o buscar manualmente.";
    lines.push(msg);
    if (topAgent) lines.push(`[AGENTS] ${topAgent.name}(${topAgent.score})`);
  }

  // AC-10 (writer half): record the suggestion for skill-usage-tracker.mjs, whenever
  // a top skill or top agent exists — independent of whether the visible text above
  // was suppressed by the D3 gate contract (the tracker still needs to know what was
  // suggested, even when the router chose not to print it).
  // W10: a write failure here used to be swallowed "best-effort" with zero signal —
  // skill-usage-tracker.mjs then has nothing to read and use/ignore tracking goes dead
  // permanently while this router's own output looks perfectly healthy. Now surfaced as
  // a `[ROUTER WARNING]` appended to the visible text (never replacing it).
  let suggestionWarning = "";
  if (topSkill || topAgent) {
    const suggestion = {
      ts: runDeps.now(),
      skill: topSkill ? topSkill.name : "",
      agent: topAgent ? topAgent.name : "",
      skill_score: topSkill ? topSkill.score : 0,
      agent_score: topAgent ? topAgent.score : 0,
      level,
      prompt: prompt.slice(0, 200),
      tech,
    };
    try {
      runDeps.fs.writeFileSync(lastSuggestionPath(runDeps), JSON.stringify(suggestion));
    } catch (e) {
      const detail = (e && e.message) || String(e);
      suggestionWarning = `[ROUTER WARNING] could not record the suggestion (${detail}) — use/ignore tracking is INACTIVE.`;
    }
  }

  const body = lines.length ? lines.join("\n") + "\n" : "";
  return suggestionWarning ? body + suggestionWarning + "\n" : body;
}

export function main(stdinString, deps = defaultDeps()) {
  try {
    return run(stdinString, deps) || "";
  } catch (e) {
    // K3: fail-open must never mean fail-SILENT — an unexpected internal error (a bad
    // `deps.path`, a truly unhandled fs edge case, etc.) still must not block or throw
    // out of the hook, but returning a bare "" makes it indistinguishable from a genuine
    // no-op. A short warning line preserves fail-open behaviour while keeping the failure
    // visible.
    const detail = (e && e.message) || String(e);
    return `[ROUTER WARNING] internal error: ${detail}\n`;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.stdout.write(main(readFileSync(0, "utf8")));
  process.exit(0);
}
