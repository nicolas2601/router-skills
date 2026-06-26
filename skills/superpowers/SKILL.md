---
name: superpowers
description: Composable skills framework de obra/superpowers (Jesse Vincent + Prime Radiant). Brainstorming, design specs, TDD, granular planning, parallel subagent coordination, code review, git worktrees. Use cuando arrancás un proyecto serio o querés disciplina senior end-to-end.
type: framework
source: https://github.com/obra/superpowers
license: MIT
when_to_use: tareas multi-fase serias (feature nueva, refactor grande, MVP), cuando querés brainstorm + plan + TDD orquestados; NO para tweaks de 5 minutos
---

# Superpowers Skills Framework

`obra/superpowers` es un framework de skills composable de Jesse Vincent + Prime Radiant. Sustituye decisiones improvisadas por una metodología clara: brainstorm → spec → plan → execute → review.

## Instalación

```bash
# Claude Code (oficial marketplace)
/plugin install superpowers@claude-plugins-official

# OpenCode / Cursor / Gemini CLI: ver README del repo
# GitHub Copilot CLI:
copilot plugin install superpowers@superpowers-marketplace
```

Tras instalar, los slash-commands quedan disponibles globalmente.

## Cuándo invocar (auto-trigger)

Activá esta skill cuando el prompt del usuario implica:

- Arrancar un proyecto desde cero ("arrancá un MVP", "diseño una app")
- Refactor o feature multi-archivo (≥5 archivos / ≥1h estimado)
- Decisión arquitectónica con trade-offs reales
- Trabajo que se va a paralelizar entre sub-agentes
- TDD estricto (RED→GREEN→TRIANGULATE→REFACTOR)

NO invoques para: typo fixes, tweaks de 1 línea, preguntas conceptuales.

## Skills incluidas (las más usadas)

| Skill | Qué hace |
|-------|----------|
| `brainstorming` | Genera 3-5 alternativas con trade-offs antes de decidir |
| `design-spec` | Spec ejecutable con BDD Given-When-Then |
| `planning-mastery` | Decompone goals en tasks atómicas <30min |
| `tdd-mastery` | Strict TDD con gates explícitos |
| `parallel-execution` | Coordina N sub-agentes via git worktrees |
| `code-review-mastery` | Review que detecta el "real bug", no solo lint |
| `git-worktrees` | Builds paralelos en branches sin conflictos |
| `verification-mastery` | Truth-scoring 0.95 threshold + auto-rollback |

## Workflow canónico

```
1. /superpowers brainstorm <topic>   → 3 alternativas con trade-offs
2. /superpowers design-spec          → spec BDD ejecutable
3. /superpowers planning             → tasks atómicas en TodoWrite
4. /superpowers tdd <task>           → RED → GREEN
5. /superpowers parallel-execute     → spawn workers en worktrees
6. /superpowers code-review          → adversarial review final
7. /superpowers verify               → truth-score ≥0.95 o rollback
```

## Integración con MiniMax kit

`superpowers` es complementario a `sdd-orchestrator` (el SDD del kit). Recomendación:

- **Tasks ≥1 día**: `Agent("sdd-orchestrator")` (más estricto, 8 fases con archivado)
- **Tasks ≤1 día con disciplina senior**: superpowers slash commands
- **Brainstorm puro sin implementación**: `/superpowers brainstorm`

## Anti-patrones detectados por superpowers

- Skipping brainstorm → te casás con la primera idea
- TDD relajado (test-after) → cobertura mentirosa
- Code review mecánica (lint only) → bugs reales pasan
- Sub-agentes sin worktrees → race conditions en file edits

## Cuándo NO usar superpowers

- Tweaks triviales (typo, rename variable, ajuste prop)
- Greenfield 100% nuevo donde todavía no hay claridad de goal
- Tareas data-only (extracción, query, report) sin componente de diseño
