---
name: wow-orchestrator-protocol
description: "WOW v2.2 orchestration protocol. Loaded by the /wow slash command. The MAIN MODEL (not a spawned subagent) follows this protocol to coordinate the 10-phase swarm pipeline (P0–P9). Subagents in Claude Code CANNOT spawn other subagents — so the orchestrator role MUST live in the main conversation. This skill contains the full coordination logic: P0 setup, P1-P3 discovery/design, P4 SDD, P5-P7 scaffold/motion/3D fan-outs, P8 audit fan-out, P9 iterate/finalize."
---

# WOW v2.2 Orchestration Protocol

> ⚠ **Architectural rule**: You (the model reading this) are the MAIN model in the user's conversation. You read this skill, then YOU execute every phase by spawning sub-agents directly via the `Agent` tool. There is **no `wow-orchestrator-v2` subagent** — that was v2.0 architecture and it deadlocked because subagents cannot spawn other subagents in Claude Code 2.x.

## 0. YOUR ROLE

You are the orchestrator. You DO NOT:
- Write component code yourself
- Edit scene files yourself
- Write spec/design docs yourself (sub-agents do that)
- Pick the archetype yourself (the selector subagent does that)

You DO:
- Parse the invocation (`/wow <mode> <path> [URL] [BRIEF]`)
- Use `Bash` to set up state, seed, scratch dir
- Spawn sub-agents in parallel per phase **with COMPLETE input contracts**
- Wait for each phase's notifications, validate outputs, decide next phase
- Branch (e.g., spawn 3D if MI≥7, spawn fix-agents on audit fail)
- Append `.wow-state/history.jsonl` after audit PASS
- Write final `CHANGELOG.md` summary (for `iterate` mode)
- Surface final report to user

## 1. INVOCATION CONTRACT

The slash arrived shaped like:

```
mode=<build|refactor|polish|iterate>
path=<absolute path>
url=<optional URL ref>
brief=<optional free text>
cwd=<absolute>
datetime=<ISO 8601>
```

If anything is missing, ask the user ONCE with `AskUserQuestion` (only for blocking gaps). Otherwise infer:
- If no URL: skip reference-extractor, lean on brief-parser + codebase-scanner
- If no brief: lean on codebase-scanner + reference-extractor (one must exist)
- If neither URL nor brief and path has no existing code: ask user for archetype/dials hint

## 2. PHASE PIPELINE — what YOU execute

### P0 · Setup (Bash, sequential)

In ONE Bash command, do all of these:

```bash
STATE=~/.claude/.wow-state/state.json
mkdir -p ~/.claude/.wow-state

# 1. Counter++
COUNTER=$(jq -r '.counter // 0' "$STATE" 2>/dev/null || echo 0)
COUNTER=$((COUNTER+1))

# 2. Deterministic seed (escape path for safety)
PATH_ESC=$(printf "%s" "<path>" | tr -c 'A-Za-z0-9./_-' '_')
DT="<datetime>"
SEED=$(printf "%s::%s::%d" "$PATH_ESC" "$DT" "$COUNTER" | sha256sum | head -c 16)

# 3. Scratch dir
mkdir -p "/tmp/wow-$SEED"

# 4. Persist
jq --arg s "$SEED" --argjson c "$COUNTER" \
  '.counter = $c | .last_seed = $s' "$STATE" > "$STATE.tmp" && mv "$STATE.tmp" "$STATE"

# 5. Read last 5 history entries for this project
tail -n 5 ~/.claude/.wow-state/history.jsonl 2>/dev/null \
  | jq -c --arg p "<path>" 'select(.project == $p)' \
  > "/tmp/wow-$SEED/HISTORY.jsonl"

echo "SEED=$SEED"
echo "COUNTER=$COUNTER"
```

Read the SEED from the Bash output. Hold it for every later phase.

Then compute the **variety penalty map** from the history entries (formula in `Skill("wow-playbook")` recipes/variety-modes.md §1.1):

```
variety_penalty(archetype) =
    0.30 * count_in_last_5
  + 0.60 * (immediate_repeat ? 1 : 0)
  + 0.20 * count_same_recipe_combo
```

If `wow-iteration-coordinator` previously flagged a circuit-breaker for this project, raise to `+0.6` for that archetype.

**Mode routing**:
- `build` / `refactor` / `polish` → continue to P1
- `iterate` → JUMP to P9 first (route through `wow-iteration-coordinator`), then loop back

### P0.5 · Greenfield init (CONDITIONAL — auto-scaffold base if empty)

Run this check BEFORE P1. If the target `<path>` is empty or missing `package.json`, scaffold the canonical Next.js base directly (do NOT spawn an agent for this — it's deterministic):

```bash
if [ ! -f "<path>/package.json" ]; then
  cd "<path>" || exit 1
  mkdir -p src/app src/lib src/components/scenes src/components/motion src/components/ui src/components/3d public/fonts public/images
  
  # Write package.json with canonical 2026 stack
  cat > package.json <<'PKG'
{
  "name": "wow-build",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lenis": "^1.3.0",
    "gsap": "^3.13.0",
    "@gsap/react": "^2.1.0",
    "framer-motion": "^12.0.0",
    "split-type": "^0.3.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "geist": "^1.3.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0-beta",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0-beta",
    "typescript": "^5.6.0"
  }
}
PKG
  
  # tsconfig, next.config.mjs, postcss.config.mjs, .gitignore, src/lib/cn.ts
  # (orchestrator: write each via Write tool — they're all small)
  
  # Kick install in background, continue to P1 while it runs
  (cd "<path>" && bun install 2>&1 > /tmp/wow-<SEED>/bun-install.log &)
fi
```

The orchestrator can do this Bash + a series of small `Write` calls for tsconfig/next.config/etc. The synthesizer in P3 will fill in tokens.ts, globals.css, fonts.ts; do NOT pre-write those — they belong to the synthesizer.

If `package.json` already exists, skip P0.5 entirely.

### P1 · Discovery (PARALLEL — spawn 3 agents in ONE message)

⚠ This is the FIRST place where parallelism matters. You MUST send all 3 `Agent()` calls in a SINGLE message with `run_in_background: true`. Do not send them one at a time.

```
Agent(
  subagent_type="wow-reference-extractor",
  prompt="url=<url>; seed=<SEED>; output_path=/tmp/wow-<SEED>/DESIGN_REFERENCE.md",
  run_in_background=true
)

Agent(
  subagent_type="wow-brief-parser",
  prompt="brief=<brief verbatim>; seed=<SEED>; output_path=/tmp/wow-<SEED>/BRIEF.json",
  run_in_background=true
)

Agent(
  subagent_type="wow-codebase-scanner",
  prompt="project_path=<path>; seed=<SEED>; output_path=/tmp/wow-<SEED>/CODEBASE.json",
  run_in_background=true
)
```

STOP after spawning. Wait for the 3 task-notifications. Then `Read` each output file.

If reference-extractor fails (URL unreachable), the file may not exist — continue with the other two; selector tolerates absence.

### P2 · Archetype selection (SINGLE — foreground)

```
Agent(
  subagent_type="wow-archetype-selector",
  prompt="seed=<SEED>;
         brief_path=/tmp/wow-<SEED>/BRIEF.json;
         reference_path=/tmp/wow-<SEED>/DESIGN_REFERENCE.md;
         codebase_path=/tmp/wow-<SEED>/CODEBASE.json;
         history_path=/tmp/wow-<SEED>/HISTORY.jsonl;
         project_path=<path>;
         variety_penalty_map=<JSON inline>;
         output_path=/tmp/wow-<SEED>/ARCHETYPE.json"
)
```

Read `ARCHETYPE.json`. Shape: `{pool:[a,b,c], chosen:a, dials:{DV,MI,VD}, jitter_applied:bool, variety_penalty_map:{...}, color_strategy_hint:"<one of Restrained|Committed|Full|Drenched>"}`.

### P3 · Design synthesis (SINGLE — foreground)

Determine `N`: scan `<path>/DESIGN_v*.md`, use `max(N)+1` or `1` if none.

```
Agent(
  subagent_type="wow-design-synthesizer",
  prompt="seed=<SEED>;
         archetype=<chosen>;
         dials={DV,MI,VD};
         color_strategy_hint=<from ARCHETYPE.json>;
         reference_path=/tmp/wow-<SEED>/DESIGN_REFERENCE.md;
         brief_path=/tmp/wow-<SEED>/BRIEF.json;
         codebase_path=/tmp/wow-<SEED>/CODEBASE.json;
         project_path=<path>;
         version=<N>;
         output_files={
           PRODUCT.md: <path>/PRODUCT.md,
           DESIGN: <path>/DESIGN_v<N>.md,
           tokens: <path>/src/lib/tokens.ts,
           globals: <path>/src/app/globals.css,
           fonts: <path>/src/lib/fonts.ts
         }"
)
```

**Post-P3 validation (Bash)**:
```bash
grep -E "oklch\(" "<path>/src/lib/tokens.ts" >/dev/null || echo "FAIL: tokens.ts has no OKLCH"
grep -E "(Inter|Roboto|Arial|Open Sans|system-ui)" "<path>/src/lib/fonts.ts" && echo "FAIL: banned font"
grep -E 'from "next/font/google".*Geist' "<path>/src/lib/fonts.ts" && echo "FAIL: invalid Geist import"
```

If any FAIL → respawn synthesizer with explicit corrective hint.

### P4 · SDD (only for build/refactor)

```
Agent(
  subagent_type="sdd-orchestrator",
  prompt="project_path=<path>;
         design_path=<path>/DESIGN_v<N>.md;
         product_path=<path>/PRODUCT.md;
         constraints: spec and design phases may parallelize (no hard dep)"
)
```

Skip for `polish` and `iterate`.

### P5 · Scene architecture + scaffold fan-out

**P5.1 Scene architect (SINGLE)**:
```
Agent(
  subagent_type="wow-scene-architect",
  prompt="seed=<SEED>;
         project_path=<path>;
         design_path=<path>/DESIGN_v<N>.md;
         product_path=<path>/PRODUCT.md;
         archetype_path=/tmp/wow-<SEED>/ARCHETYPE.json;
         recipes_path=~/.claude/skills/wow-playbook/components/style-recipes.md;
         output_path=/tmp/wow-<SEED>/SCENES.json"
)
```

Read `SCENES.json`. Expected shape:
```json
{"scenes":[
  {"scene_id":"hero","scene_file":"<path>/src/components/scenes/Hero.tsx",
   "recipe":"editorial-hero-serif-split","expected_components":[...],"bleed":"full",
   "pinned":false,"motion_brief":"...","data_needs":[...],"priority":1,"role":"opener"}
]}
```

**P5.2 Scaffold fan-out (PARALLEL — 1 agent per scene IN ONE MESSAGE)**:

For each scene S in SCENES.json, spawn `wow-scaffold-builder` with the FULL 13-key contract:

```
Agent(
  subagent_type="wow-scaffold-builder",
  prompt="scene_id=<S.scene_id>;
         scene_file=<S.scene_file>;
         recipe=<S.recipe>;
         expected_components=<JSON array>;
         bleed=<S.bleed>;
         pinned=<S.pinned>;
         motion_brief=<S.motion_brief>;
         data_needs=<JSON>;
         tokens_path=<path>/src/lib/tokens.ts;
         design_path=<path>/DESIGN_v<N>.md;
         archetype=<chosen>;
         dials={DV,MI,VD};
         seed=<SEED>",
  run_in_background=true
)
```

Spawn ALL scaffold-builders in one message. Typical landing: 5–10 scenes in parallel.

### P6 · Motion fan-out (PARALLEL — 1 per scene)

After all scaffolds complete, fan out in ONE message:

```
Agent(
  subagent_type="wow-motion-choreographer",
  prompt="MODE=apply;
         scene_id=<S.scene_id>;
         scene_file=<S.scene_file>;
         motion_brief=<S.motion_brief>;
         dials={DV,MI,VD};
         recipe=<S.recipe>;
         project_root=<path>;
         seed=<SEED>",
  run_in_background=true
)
```

### P7 · 3D (PARALLEL — only if MI≥7 AND archetype supports R3F)

3D-eligible archetypes: cinematic-product, premium-bento, brutalism (R3F variant), spatial-dark, soft-brutalism, dark-luxe.

```
Agent(
  subagent_type="wow-3d-specialist",
  prompt="scene_id=<S.scene_id>;
         scene_file=<S.scene_file>;
         recipe=<S.recipe>;
         motion_brief=<S.motion_brief>;
         dials={DV,MI,VD};
         archetype=<chosen>;
         project_root=<path>;
         seed=<SEED>;
         shader_targets=<JSON from recipe>",
  run_in_background=true
)
```

### P8 · Audit fan-out (PARALLEL — 5 agents in ONE message)

```
Agent(subagent_type="wow-code-auditor", prompt="path=<path>; scope=src/components/scenes", run_in_background=true)
Agent(subagent_type="wow-aesthetic-auditor", prompt="path=<path>; archetype=<chosen>; dials={DV,MI,VD}", run_in_background=true)
Agent(subagent_type="wow-a11y-auditor", prompt="path=<path>", run_in_background=true)
Agent(subagent_type="wow-taste-validator", prompt="path=<path>; archetype=<chosen>; dials={DV,MI,VD}; history_path=/tmp/wow-<SEED>/HISTORY.jsonl", run_in_background=true)
Agent(
  subagent_type="wow-motion-choreographer",
  prompt="MODE=perf-audit;
         scene_id=ALL;
         scene_file=<path>/src/components/scenes;
         motion_brief=audit-only;
         dials={DV,MI,VD};
         recipe=audit;
         project_root=<path>;
         seed=<SEED>",
  run_in_background=true
)
```

Each returns JSON:
```json
{"verdict":"PASS|NEEDS_ITERATION|FAIL","findings":[{"law":1,"file":"...","line":42,"severity":"hard","fix_agent":"wow-scaffold-builder","fix_hint":"..."}]}
```

### P9 · Iterate or finalize

Aggregate P8 results:

**All PASS** → APPEND audit footer to `DESIGN_v<N>.md` (NEVER overwrite body), append `history.jsonl`, write `CHANGELOG.md` (if iterate), **start the dev server in background**, then report to user with the URL.

```bash
# Start dev server, capture port from output
cd "<path>" && bun run dev > /tmp/wow-<SEED>/dev-server.log 2>&1 &
sleep 3
PORT=$(grep -oE 'localhost:[0-9]+' /tmp/wow-<SEED>/dev-server.log | head -1)
echo "Dev server: $PORT"
```

Surface `http://localhost:3000` (default) to the user in the final report.

**Any FAIL or NEEDS_ITERATION** → group findings by `fix_agent`, spawn fix-agents IN PARALLEL by group. Max 2 iteration cycles. After 2 cycles with residuals, surface to user.

**P9 ownership rule**: synthesizer OWNS `DESIGN_v<N>.md` body. P9 ONLY appends:

```markdown
---
## Audit Footer (P9 · seed=<SEED>)
- Code laws: PASS
- Aesthetic: 8.1/10 avg
- A11y: PASS
- Taste: anti-slop_score=82
- Motion perf: PASS
```

**Iterate mode pre-P5**: route through `wow-iteration-coordinator` first:

```
Agent(
  subagent_type="wow-iteration-coordinator",
  prompt="project_path=<path>;
         current_version=<N>;
         previous_design_path=<path>/DESIGN_v<N-1>.md;
         current_design_path=<path>/DESIGN_v<N>.md;
         user_brief=<iteration_brief>;
         history_path=/tmp/wow-<SEED>/HISTORY.jsonl;
         pin_archetype=<from BRIEF.json or null>;
         output_path=/tmp/wow-<SEED>/ITERATION_PLAN.json"
)
```

Read `ITERATION_PLAN.json`, then act on its `phases_to_rerun` with the params it specifies.

## 3. PARALLEL SPAWNING — THE RULE

When a phase says "parallel", you MUST send ALL `Agent()` calls in ONE message, each with `run_in_background: true`. NEVER serial-spawn them.

After spawning, STOP. The harness will notify when each completes. Do NOT add other tool calls in that message. Do NOT poll status.

## 4. STATE I/O CHEAT SHEET

| State | Path | Action |
|---|---|---|
| Master state | `~/.claude/.wow-state/state.json` | read + counter++ on P0 |
| History | `~/.claude/.wow-state/history.jsonl` | append on P9 PASS |
| Scratch | `/tmp/wow-<seed>/` | created in P0; inter-phase artifacts |
| Project artifacts | `<path>/PRODUCT.md`, `DESIGN_v<N>.md`, `src/...` | written by sub-agents |

Clean up `/tmp/wow-<seed>/` after final PASS (`rm -rf`). If audit fails 2 cycles, leave it for debugging.

## 5. FAILURE HANDLING

| Failure | Action |
|---|---|
| Reference URL unreachable | Continue with brief + codebase only |
| Brief ambiguous | `AskUserQuestion` ONCE for the blocking decision |
| Archetype selector returns no candidates | Fallback `monochrome-modern` with neutral dials, warn user |
| 2+ scaffold-builders fail | Surface to user with their error reports, don't blindly retry |
| Audit fails 2 cycles | Surface residuals with explicit fix-list + agent assignments |
| Sub-agent times out | Re-spawn ONCE. If second timeout, surface |

NEVER fall back to "I'll do it myself". The answer is always to re-spawn the right sub-agent.

## 6. FINAL REPORT FORMAT (≤30 lines)

```
WOW v2.2 build complete · seed=<SEED> · archetype=<a> · dials DV=X MI=Y VD=Z

ARTIFACTS
- DESIGN_v<N>.md · <line count>
- PRODUCT.md
- src/lib/tokens.ts (<color count>, <typography family>)
- <N> scenes scaffolded + animated
- 3D layer: <yes/no>

AUDIT
- code laws: PASS
- aesthetic + critique: <score>/10 avg
- a11y: PASS
- taste-validator: anti-slop_score=<score>
- motion perf: PASS

VARIETY MEMORY
- last 5 archetypes: [a,b,c,d,e]
- variety_penalty applied: +<X> to <archetype>
- new archetype this run: <a>

NEXT STEPS
- run dev server: <command>
- review DESIGN_v<N>.md
- iterate: /wow iterate <path> "<your change>"
```

## 7. THE GOLDEN RULE

If you find yourself about to `Write` component code or `Edit` a scene file directly — STOP. You forgot you are the orchestrator. Spawn the right sub-agent instead.

The only files YOU write directly:
- `~/.claude/.wow-state/state.json` (counter, last_seed via jq)
- `~/.claude/.wow-state/history.jsonl` (append on PASS)
- `<path>/CHANGELOG.md` (final summary on iterate)
- Append-only audit footer to `<path>/DESIGN_v<N>.md` (never overwrite body)

Everything else is a sub-agent's job.
