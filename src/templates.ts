/**
 * Inlined enforcement templates.
 * Kept as string constants (not external files) so a compiled single-file
 * binary still works without an assets/ dir at runtime.
 */

/** Claude Code hook — a Node script (cross-platform; bash is not on Windows). */
export const HOOK_MJS = `#!/usr/bin/env node
// skill-forced-eval.mjs — Claude Code UserPromptSubmit hook (installed by router-skills)
// Forces deterministic skill evaluation before every response.
// stdout is injected into the model context as a <system-reminder>.

const DIRECTIVE = \`INSTRUCTION: MANDATORY SKILL EVALUATION (blocking — do this BEFORE anything else)

Before responding, scan the <available_skills> catalog and decide which skills fit THIS request.

Rules:
1. Pick the MOST SPECIFIC skill(s) for the task, not the generic default.
   - Prefer a framework/domain skill (e.g. nextjs-best-practices, laravel-security,
     sql-optimization-patterns) over a broad one (e.g. coding-standards) when both match.
   - A task can match SEVERAL skills — activate ALL that apply, not just one.
2. Do NOT keep reaching for the same handful of skills out of habit. Re-evaluate the
   full catalog each turn. The best skill for this task may be one you have never used.
3. If ANY skill is relevant:
   a. State in ONE line which skills you are activating and why (only the relevant ones).
   b. Activate each via the Skill() tool BEFORE writing code or giving the answer.
4. If NOTHING is genuinely relevant, proceed directly — no statement, no forced match.

CRITICAL: Mentioning a skill without calling Skill() is worthless. Activate, then act.
Skip this evaluation only for trivial conversational replies with no technical task.\`;

// Fail open: a hook crash must never block the user's prompt.
try {
  process.stdout.write(DIRECTIVE + "\\n");
} catch {}
process.exit(0);
`

/** opencode plugin — TS, auto-loaded from ~/.config/opencode/plugins/. */
export const PLUGIN_TS = `/**
 * skill-enforcer — OpenCode plugin (installed by router-skills)
 *
 * Parity with the Claude Code skill-forced-eval hook. Injects a mandatory
 * skill-evaluation directive into the system prompt of every message.
 * Auto-loaded because it lives in ~/.config/opencode/plugins/.
 */

import type { Plugin } from "@opencode-ai/plugin"

const SKILL_DIRECTIVE = \`## MANDATORY SKILL EVALUATION (blocking — before every technical response)

You have a large catalog of Agent Skills discovered globally. Before answering a
technical request you MUST evaluate them and use the best fit. This is not optional.

Rules:
1. Pick the MOST SPECIFIC skill(s) for the task, not a generic default. Prefer a
   framework/domain skill (e.g. nextjs-best-practices, laravel-security,
   sql-optimization-patterns) over a broad one (e.g. coding-standards) when both match.
2. A task can match SEVERAL skills — load ALL that apply, not just one.
3. Do NOT keep reaching for the same handful of skills out of habit. Re-evaluate the
   full catalog each turn; the best skill may be one you have never used.
4. If any skill is relevant: state in one line which you are using and why, load it via
   the skill tool BEFORE writing code, then proceed.
5. If nothing genuinely fits, proceed directly — no forced match.

Loading a skill's SKILL.md before the work is a discipline requirement. Naming a skill
without loading it is worthless. Skip only for trivial non-technical replies.\`

const MARKER = "MANDATORY SKILL EVALUATION"

export const SkillEnforcer: Plugin = async () => {
  return {
    "experimental.chat.system.transform": async (_input: any, output: any) => {
      try {
        if (!output || typeof output !== "object") return
        const sys: any[] = Array.isArray(output.system) ? output.system : (output.system = [])
        // idempotent — never inject the directive twice into the same request
        if (sys.some((s) => typeof s === "string" && s.includes(MARKER))) return
        const last = sys.length - 1
        if (last >= 0 && typeof sys[last] === "string") sys[last] += "\\n\\n" + SKILL_DIRECTIVE
        else sys.push(SKILL_DIRECTIVE)
      } catch {
        // A plugin error must never break the chat pipeline — fail open.
      }
    },
  }
}

export default SkillEnforcer
`

/**
 * opencode instructions rule — plain Markdown, registered in opencode.json's
 * `instructions[]`. Belt-and-suspenders: guarantees the skill-eval directive is in
 * context every session even if the plugin fails to load (opencode reads instruction
 * files unconditionally, whereas a plugin can error out at startup).
 */
export const SKILL_RULE_MD = `# MANDATORY SKILL EVALUATION (blocking — before every technical response)

You have a large catalog of Agent Skills discovered globally. Before answering a
technical request you MUST evaluate them and use the best fit. This is not optional.

Rules:
1. Pick the MOST SPECIFIC skill(s) for the task, not a generic default. Prefer a
   framework/domain skill (e.g. nextjs-best-practices, laravel-security,
   sql-optimization-patterns) over a broad one (e.g. coding-standards) when both match.
2. A task can match SEVERAL skills — load ALL that apply, not just one.
3. Do NOT keep reaching for the same handful of skills out of habit. Re-evaluate the
   full catalog each turn; the best skill may be one you have never used.
4. If any skill is relevant: state in one line which you are using and why, load it via
   the skill tool BEFORE writing code, then proceed.
5. If nothing genuinely fits, proceed directly — no forced match.

Loading a skill's SKILL.md before the work is a discipline requirement. Naming a skill
without loading it is worthless. Skip only for trivial non-technical replies.
`
