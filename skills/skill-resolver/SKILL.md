---
name: skill-resolver
description: Resolves skill registry for a project, extracts Compact Rules (5-15 lines per skill), pre-digests them for injection into sub-agent prompts. Used by orchestrators to avoid passing skill file paths to sub-agents. Compaction-safe.
allowed-tools: Read, Grep, Glob, mcp__engram__mem_search, mcp__engram__mem_save
version: 1.0.0
---

# Skill Resolver

Resolves the project's skill registry once per session, distills each skill to a compact rule block, and hands the distilled text to sub-agents as part of their prompt. Eliminates the need for sub-agents to read skill files — which they cannot reliably do anyway, because Task is not in their tool list and compaction strips raw file paths.

## Problem

Sub-agents spawned by an orchestrator inherit neither the orchestrator's Task tool nor its full context. Three failure modes are common:

1. **Path injection fails silently**: the orchestrator writes "follow `~/.claude/skills/strict-tdd/SKILL.md`" into the sub-agent prompt. Mid-session compaction drops the path; the sub-agent cannot recover it.
2. **Re-reading is expensive**: making every sub-agent open and parse N SKILL.md files burns tokens and latency, and the files often include long examples irrelevant to the task.
3. **Inconsistent enforcement**: different sub-agents may read different subsets of skills, producing uneven standards across a single deliverable.

## Solution

The orchestrator resolves **once per session**. It builds a `skill-registry/<project>` record containing Compact Rules, caches it in engram, and injects the rules verbatim into every sub-agent prompt under a dedicated `## Project Standards (auto-resolved)` section.

## Resolution Flow

1. **Cache check**: `mcp__engram__mem_search(query="skill-registry/<project>", top_k=1)`. If a fresh hit (TTL ≤ 24h or same git HEAD) → use cached Compact Rules, skip to injection.
2. **Scan skill directories** in priority order:
   - `<project>/.claude/skills/**/SKILL.md` (project-local, highest priority)
   - `~/.agents/skills/**/SKILL.md`
   - `~/.claude/skills/**/SKILL.md`
3. **Scan project docs** for implicit rules:
   - `<project>/AGENTS.md`
   - `<project>/CLAUDE.md`
   - `<project>/CONTRIBUTING.md`
4. **Extract Compact Rules** per source (see algorithm below).
5. **Persist**: `mcp__engram__mem_save(topic_key="skill-registry/<project>", content=<compact_rules>, tags=["skill-registry", "<project>"])`.
6. **Inject** into every sub-agent prompt spawned during the session.

If a new session starts, skip to step 1 — cache hit is the hot path.

## Compact Rules Algorithm

Per `SKILL.md` (or `AGENTS.md` section):

1. Read the `description` field from frontmatter — that is the one-line intent.
2. Read body sections whose headings match `## Rules`, `## Anti-patterns`, `## When to use`, `## Handoff Checklist`, `## Gates`.
3. Bulletize: one imperative rule per line. Strip examples, code blocks, long prose.
4. Cap at **15 lines per skill**, prefer 5-10. If more are truly needed, split the skill.
5. Prefix each line with `[<skill-name>]` so sub-agents can attribute violations.

Format:

```
- [<skill-name>] <imperative rule in one line>
```

Imperative voice, present tense. Good: `Never write production code without a failing test`. Bad: `You should try to avoid writing code without tests`.

## Injection Format

Paste verbatim at the top of every sub-agent prompt, above the task description:

```
## Project Standards (auto-resolved)
<source: skill-registry/<project>, resolved at 2026-04-23T21:50Z, 12 skills, hash a3f2...>

- [strict-tdd] Never write production code without a failing test first
- [strict-tdd] Confirm RED output literally before moving to GREEN
- [strict-tdd] Triangulate with a second test before generalizing
- [code-review] Flag SQL injection, hardcoded secrets, and unhandled error paths at boundaries
- [code-review] Reject diffs that lower the coverage baseline
- [branch-pr] Branch name is feat/<issue-#>-<short-description>
- [branch-pr] One logical change per PR; split unrelated refactors
- [judgment-day] Re-run two blind judges after non-trivial diffs (>50 LOC or security/pay/auth)
- [judgment-day] Classify warnings as real vs theoretical before fixing

If a rule conflicts with the task, stop and raise it — do not silently override.
```

## Feedback Loop

Every sub-agent's Result Contract must echo one of:

- `skill_resolution: "injected"` — rules were present and followed.
- `skill_resolution: "fallback-registry"` — rules missing from prompt; sub-agent read the engram registry directly.
- `skill_resolution: "fallback-path"` — sub-agent resorted to reading SKILL.md files (costly, slow).
- `skill_resolution: "none"` — no rules available; sub-agent proceeded on its own judgment.

The orchestrator treats anything other than `injected` as a resolver bug:

- `fallback-registry` → cache is stale or injection was malformed; rebuild + re-inject.
- `fallback-path` → engram lookup failed; check engram health, re-resolve from disk.
- `none` → emergency: escalate to the user before continuing.

## Example

Input to resolver: project `ruflo-v3`, task `implement login JWT`.

Resolved sources (5 matches):

1. `.claude/skills/strict-tdd/SKILL.md`
2. `.claude/skills/code-review/SKILL.md`
3. `.claude/skills/branch-pr/SKILL.md`
4. `AGENTS.md` § "Security rules"
5. `CONTRIBUTING.md` § "Commit style"

Distilled to 9 Compact Rules, injected into the `sdd-apply` sub-agent prompt.

Sub-agent produces code that honors the rules without ever reading a `.md` file. Its Result Contract comes back with `skill_resolution: "injected"`. Orchestrator proceeds.

## Handoff Checklist

Before spawning a sub-agent:

- [ ] `skill-registry/<project>` exists in engram and is fresh
- [ ] Compact Rules block is ≤ 300 lines total (prevents prompt bloat)
- [ ] Every rule is imperative, single-line, skill-prefixed
- [ ] Injection header includes timestamp, source key, skill count, content hash
- [ ] Sub-agent prompt template reserves the `## Project Standards (auto-resolved)` section

## Integration with Claude Code

- Orchestrators call this skill once at session start (or on first sub-agent spawn).
- The `maestro` and `agents-orchestrator` agents depend on it — they assume rules are pre-digested.
- Pairs with `strict-tdd` and `judgment-day`: the rules from those skills show up in the injected block, so sub-agents enforce them without needing Task.
