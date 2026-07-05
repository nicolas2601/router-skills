---
name: triple-check
description: Best-of-3 ensemble with LLM judge. Use for AMBIGUOUS or HIGH-STAKES tasks (architecture decisions, deploy-blocking bugs, refactor >200 lines). Runs 3 variants in parallel, judge selects best. Costs 3-4x tokens but +18% accuracy vs single shot.
allowed-tools: Task, Read, Grep
version: 1.0.0
---

# triple-check — Ensemble decision-making with judge

## Propósito

Para tareas de **alto impacto o alta ambigüedad**, un solo intento de respuesta no es suficiente — especialmente con MoE como MiniMax M2.7 que tiene varianza entre runs. Este skill lanza **3 variantes en paralelo** con prompting distinto, luego un **LLM judge** selecciona la mejor (o sintetiza una superior).

**ROI esperado**: +18% accuracy vs single-shot, a cambio de 3-4× tokens.

## Cuándo usar

Úsalo cuando la tarea cumple **al menos uno**:
- **Arquitectura**: "elige entre Postgres/Mongo", "monolito vs microservicios", "qué patrón aplico aquí".
- **Security-critical fixes**: patch de auth, autorización, injection, crypto.
- **Refactors grandes**: >200 líneas o >5 archivos o cambios de contrato público.
- **Deploy decisions**: "¿puedo hacer release?", "¿roll-back o forward-fix?".
- **Trade-offs reales**: más de una opción defendible con consecuencias distintas.

## Cuándo NO usar (anti-patrón)

- Tareas triviales: 1-file edit, rename variable, typo fix.
- Preguntas factuales: "¿qué hace este flag?" → Read/context7 basta.
- Código boilerplate: CRUD estándar, config files.
- Cuando el usuario ya decidió y solo quiere ejecución.

Si detectas que la tarea es simple (<50 LOC esperado, sin ambigüedad): **aborta y sugiere single-shot**. Decir "esto no necesita triple-check, voy directo" es válido y ahorra tokens.

## Workflow

### 1. LAUNCH — 3 variantes en paralelo

Usa la tool `Task` **en un solo mensaje con 3 llamadas paralelas**. Cada variante con prompting distinto:

- **Variant A (Direct)**: prompt imperativo y directo. "Resuelve X. Entrega solución concreta sin preámbulo."
- **Variant B (Clarifier)**: prompt con CoT explícito. "Antes de responder: lista 3 preguntas de clarificación que un senior haría. Después respóndelas tú mismo con suposiciones razonables. Luego resuelve."
- **Variant C (Alternative-explorer)**: prompt comparativo. "Genera 2 approaches distintos a este problema. Para cada uno: pros, contras, riesgos. Luego recomienda UNO y justifica."

Cada Task recibe el mismo contexto base pero distinto system/task prompt.

### 2. COLLECT — esperar las 3 respuestas

Las 3 Task calls corren en paralelo. Cuando las 3 regresen, tendrás A, B, C como strings.

**NO polles**. El harness te notifica cuando terminan.

### 3. JUDGE — síntesis por juez

Lanza **una cuarta Task** con prompt de judge:

```
Eres un judge imparcial. Recibes 3 respuestas a la misma pregunta.

Pregunta original: <pregunta>

Respuesta A:
<texto A>

Respuesta B:
<texto B>

Respuesta C:
<texto C>

Evalúa cada una contra:
1. Correctness (¿resuelve el problema sin errores?)
2. Completeness (¿cubre edge cases, tests, errores?)
3. Reasoning quality (¿justifica decisiones?)
4. Practicality (¿ejecutable en 1 sprint?)

Retorna en JSON:
{
  "choice": "A" | "B" | "C" | "synthesis",
  "rationale": "<3-5 bullets>",
  "winner_text": "<respuesta final, copiada de la ganadora o sintetizada>",
  "confidence": 0-100
}

Si ninguna es ≥80/100, haz synthesis: combina lo mejor de cada una.
```

### 4. RETURN — al usuario

Entrega el `winner_text` con metadata:

```
<respuesta ganadora>

---
Triple-checked:
- Judge eligió: <A|B|C|synthesis>
- Confidence: <N>/100
- Rationale: <resumen 1-2 líneas>
```

## Cost control

- Si las 3 variantes son casi idénticas (judge rationale = "all similar"), informa al usuario: "las 3 variantes coincidieron, bajo riesgo de varianza".
- Si después de judge la confidence es <70, pide más contexto al usuario antes de ejecutar.
- Máximo **1 nivel** de triple-check: NO llames triple-check dentro de una variante.

## Ejemplo real

**Pregunta**: "¿Uso Redis o MongoDB para session store en un SaaS B2B con 10k usuarios activos?"

- **Variant A (Direct)**: "Redis. Latencia <1ms, TTL nativo, es el estándar para sessions. Postgres/Mongo son overkill."
- **Variant B (Clarifier)**: "Preguntas clave: (1) ¿sessions necesitan persistencia si Redis cae? (2) ¿hay queries complejas sobre sessions? (3) ¿budget para managed Redis (Azure Cache)? Asumiendo no-persistencia crítica + sin queries + budget OK → Redis."
- **Variant C (Alternative)**: "Opción 1: Redis (pros: velocidad, TTL, estándar / cons: persistencia frágil). Opción 2: Postgres con tabla `sessions` + índice en `user_id` (pros: una sola infra, ACID / cons: latencia 10-50ms, necesitas cron para expirar). Para 10k MAU: Postgres es suficiente si ya tienes la DB; Redis solo si latencia <5ms es hard requirement. Recomiendo **Postgres** por simplicidad ops."

**Judge**: "C tiene mejor reasoning (considera ops burden, no solo perf). Synthesis: Postgres para empezar → Redis si observas p95 latency >50ms. Confidence 85/100."

**Entrega final**: Postgres como default, con plan de migración a Redis basado en métricas observables.

## Integración con otros skills

- `self-critique` corre DENTRO de cada variante (draft → critique → publish).
- `triple-check` corre SOBRE el resultado completo de un agente.
- Si invocas `judgment-day` después de triple-check, es overkill — pick one.
