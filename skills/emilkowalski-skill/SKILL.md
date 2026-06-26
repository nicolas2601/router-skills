---
name: emilkowalski-skill
description: Skill file de Emil Kowalski (animations.dev) sobre animation/design/code/performance. Curated de sus artículos. Selectivo — invocá solo en revisiones de animación o cuando el motion está mal calibrado, no en todo prompt.
type: knowledge-base
source: https://github.com/emilkowalski/skill
author_site: https://emilkowal.ski
when_to_use: revisar animaciones existentes (timing/easing/choreography), diseñar transitions sutiles, corregir motion que se siente "robótico" o "demasiado bounce"; NO en greenfield porque es review-oriented
---

# Emil Kowalski Skill — Animation Engineering

Emil Kowalski (Vercel, ex-Linear) curó este skill con principios de animation/design destilados de sus artículos. Es **opinionated y selectivo** — Emil lo recomienda usar puntualmente, no como always-on.

## Instalación

```bash
npx skills add emilkowalski/skill
```

Compatible con Claude Code, Cursor, Codex, GitHub Copilot, Windsurf.

## Cobertura

- **Animations** — timing, easing, choreography, micro-interactions
- **Design** — visual hierarchy, restraint, density
- **Code** — patterns para componentes con animation (Framer Motion, GSAP, vanilla CSS)
- **Performance** — RAF, will-change, transform vs top/left, paint vs composite
- **UI craft** — empty states, loading, transitions, focus management

## Cuándo invocar

### SÍ usar
- Revisar una animación existente que "no se siente bien"
- Calibrar easing/duration de un set de transitions
- Decidir si una animación debe ser CSS o JS
- Auditar performance de motion (paints, layout thrashing)
- Diseñar micro-interactions (hover states, button press, drawer slide)

### NO usar
- Siempre — Emil mismo lo recomienda selectivo
- Greenfield: usá `frontend-design` o `minimax-premium-landing` primero
- Animaciones simples (fade in, slide up) — pattern conocido, no requiere skill

## Principios canónicos del skill

### Easing
- Default `ease-out` para enter, `ease-in` para exit (asymmetric)
- Spring para gestures (drawer, modal, drag), tween para state transitions
- Evitá `ease-bounce` y `ease-elastic` salvo en momentos festivos puntuales
- Curvas custom Bezier: `cubic-bezier(0.16, 1, 0.3, 1)` para "out" suave

### Duration
- Micro: 100-200ms (button press, hover)
- Standard: 250-400ms (modal, drawer, page transitions)
- Macro: 600-800ms (hero reveals, choreographed sequences)
- >1000ms = solo intencional (cinematográfico)

### Choreography
- Stagger 30-60ms entre items en listas (no más, se siente lento)
- Parent → children, not all at once
- Exit faster than enter (típicamente 60% del enter duration)

### Performance
- **Solo `transform` y `opacity`** para paths críticos (compositor-only)
- `will-change: transform` sí cuando la animación está activa, NO siempre
- `position: absolute` o `fixed` los elementos que se animan (saca del flow)
- RAF para JS animations, no setTimeout

## Integración con kit

Emil's skill complementa:
- `gsap-core` / `gsap-timeline` / `gsap-scrolltrigger` — Emil te dice CUÁNDO/POR QUÉ, GSAP te da el CÓMO
- `minimax-design-loop` — usá emilkowalski-skill en la fase CRITIQUE para evaluar motion
- `impeccable` — Emil overlap con `/impeccable animate` pero más profundo

## Recurso adicional

El curso `animations.dev` de Emil cubre lo que el skill resume + ejercicios prácticos. Recomendado si vas a hacer mucho motion en el proyecto.

## Output esperado

Tras invocar `Skill("emilkowalski-skill")` para review:

```
ANIMATION REVIEW (Emil-mode):

Modal drawer:
  ❌ Duration 600ms para abrir → debería ser 300-400ms
  ❌ ease-in-out simétrico → preferí ease-out (cubic-bezier(0.16, 1, 0.3, 1))
  ✓ Backdrop fade en paralelo (correcto)

Lista de cards (5 items):
  ❌ Stagger 100ms → demasiado lento, bajá a 40ms
  ❌ Todos animan opacity + translateY 20px → considerá scale subtle 0.96→1
  ❌ will-change permanente → solo durante la animación

CTA hover:
  ✓ Transform-only (compositor)
  ⚠️ 250ms para hover → bajá a 150ms (micro-interaction)
```
