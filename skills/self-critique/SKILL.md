---
name: self-critique
description: Draft → critique → revise loop. Use after writing ANY non-trivial code (>30 lines) or making security/perf claims. Cheaper than triple-check (2x tokens) with +12% correctness.
allowed-tools: Read, Grep, Task
version: 1.0.0
---

# self-critique — Draft, critique, decide

## Propósito

Los LLM (incluso Opus) generan código que "parece correcto" pero tiene bugs sutiles: null checks faltantes, edge cases, race conditions, inyecciones, N+1 queries. Este skill fuerza un **segundo pass crítico** sobre tu propio draft antes de publicarlo.

**ROI**: ~2× tokens, +12% correctness (menos que triple-check pero mucho más barato).

## Cuándo usar (triggers)

Invoca **siempre** después de:
- Escribir ≥30 líneas de código nuevo.
- Hacer una claim sobre seguridad, performance, concurrencia.
- Proponer un fix para un bug reportado por el usuario.
- Terminar la fase GREEN de strict-tdd (antes de TRIANGULATE).
- Responder a "¿esto es seguro?" / "¿esto escala?" / "¿funcionará en prod?".

## Cuándo NO usar

- Explicaciones cortas (<100 palabras).
- Preguntas factuales ("¿qué hace este flag?").
- Respuestas que ya están citando docs/source verificado (la verificación es el critique).
- Respuestas donde ya invocaste `triple-check` (redundante).

## Workflow

### Fase 1 — DRAFT

Escribe tu primera versión completa. No te autocensures aquí; el objetivo es tener algo concreto que criticar.

### Fase 2 — CRITIQUE

Abre un bloque `<critique>` y pasa el draft por el **7-point checklist**:

```
<critique>

1. Type safety / null-checks:
   - [ ] Todos los params tienen type explícito o inferido claro
   - [ ] Se maneja undefined/null en accesos anidados (a?.b?.c)
   - [ ] Returns tienen type declarado

2. Error handling:
   - [ ] Try/catch en boundaries (I/O, red, DB, parse, JSON)
   - [ ] Errores propagados con contexto (no silent catches)
   - [ ] Cleanup en finally cuando aplica (conexiones, files, locks)

3. Security:
   - [ ] Inputs validados (zod/class-validator/checks manuales)
   - [ ] No SQL raw con string concat → parametrized
   - [ ] No path traversal (`../`, absolute paths en user input)
   - [ ] No secrets en código (process.env + .env.example)
   - [ ] XSS/CSRF en endpoints que renderizan HTML

4. Performance obvias:
   - [ ] No N+1 (loops que hacen query dentro)
   - [ ] No loops anidados sobre N grande sin justificación
   - [ ] Promise.all donde hay I/O paralelo obvio
   - [ ] No allocs innecesarios en hot path

5. Tests:
   - [ ] Happy path cubierto
   - [ ] Al menos 1 edge (empty, null, max size)
   - [ ] Mocks de deps externas (DB, HTTP)

6. Edge cases:
   - [ ] Input vacío / whitespace-only
   - [ ] Input malformado (JSON inválido, UTF-8 inválido)
   - [ ] Timeouts / cancellation / AbortSignal
   - [ ] Concurrencia (si aplica): race conditions, deadlocks

7. Maintainability:
   - [ ] Sin magic numbers (extraer a const nombrada)
   - [ ] Nesting <4 (extraer helpers si excede)
   - [ ] Nombres significativos (no `data`, `temp`, `x`)
   - [ ] Comentario para "el por qué", no "el qué"

Issues encontrados:
- [lista concisa: severity + descripción + línea]

</critique>
```

**Severity**:
- `critical`: seguridad, correctness bug que afecta output.
- `major`: performance problem real, missing error handling en boundary.
- `minor`: naming, nesting, comentarios.

### Fase 3 — DECIDE

Aplica las reglas **sin discreción**:

| Issues | Acción |
|---|---|
| 0 total | Publish draft **as-is** |
| 1-2 minor | **Patch inline** y publish |
| ≥1 critical | **REWRITE** desde cero (no parches críticos, puedes perder algo) |
| ≥3 any | **REWRITE** (indicador de que el draft estaba mal) |
| ≥2 major | **REWRITE** (no patches piecemeal sobre algo débil) |

### Fase 4 — PUBLISH

Entrega la versión final con nota de meta:

```
<código final>

---
Self-critique: N issues found (critical: X, major: Y, minor: Z)
Acción: [published as-is | patched inline | rewritten from scratch]
[Lista breve de qué cambió si se patcheó o reescribió]
```

## Anti-patrones a evitar

- **NO uses self-critique para explicaciones conversacionales cortas** — es ruido.
- **NO hagas el critique con los mismos ojos del draft** — intenta leerlo como reviewer adversarial ("un senior que busca razones para rechazar este PR").
- **NO parches críticos** — si detectaste SQL injection, reescribe. Parches críticos dejan corner cases.
- **NO declares "0 issues" sin leer el checklist completo** — es tentador pero pierdes el valor.

## Integración con strict-tdd

Orden canónico en un ciclo TDD:

1. **RED**: escribe test fallando.
2. **GREEN**: escribe código mínimo que pasa.
3. **→ self-critique aquí ←** sobre el código GREEN.
4. **TRIANGULATE**: más tests / edge cases.
5. **REFACTOR**: mejoras sin cambiar behavior.

El critique entre GREEN y TRIANGULATE detecta gaps que los tests no cubren (seguridad, performance, error handling) y te dice qué tests agregar en TRIANGULATE.

## Integración con otros skills

- `code-review`: reviewa diff completo, es más pesado → úsalo al cerrar feature, no por cada función.
- `judgment-day`: adversarial review con 2 jueces → más costoso, para decisiones finales pre-merge.
- `triple-check`: para ambigüedad arquitectónica → self-critique es para code correctness.

## Ejemplo compacto

**Draft**: función que busca users por email, retorna primero que matchea.

**Critique**:
- (critical) SQL raw con string concat → injection
- (major) No hay handling si DB retorna 0 rows → retorna undefined silencioso
- (minor) Variable `r` poco descriptiva

**Decide**: 1 critical → REWRITE.

**Publish**: versión con ORM parametrizado + throw NotFoundError explícito + nombre `user`. Nota: "Self-critique: 3 issues (1 crit, 1 maj, 1 min). Acción: rewritten from scratch (SQL injection eliminada, error handling agregado)."
