---
name: prompt-template-engineering
description: |
  Patrón meta para escribir mega-prompts one-shot que producen apps premium en una sola pasada. Aprendido del template MEGA-PROMPT analizado (cinematic landing). 7 pilares: (1) brief target+success, (2) placeholders legend tabla única, (3) pre-step pipeline (deps externas), (4) stack non-negotiable, (5) anti-slop guardrails 12-15 reglas, (6) verification ejecutable, (7) "no preguntes, ejecutá". Trigger mega-prompt, one-shot prompt, prompt template, prompt engineering avanzado, lovable v0 cursor prompt.
when_to_use: |
  Querés que un modelo (cualquier modelo: Lovable, v0, Cursor, Claude, M2.7) genere un proyecto completo en una sola pasada.
  Cliente pide template reutilizable que su equipo pueda customizar.
  Necesitás reproducibilidad: mismo prompt + diferentes placeholders = misma calidad.
when_NOT_to_use: |
  Tarea exploratoria (modelo decide arquitectura) — esto exige stack fijo.
  Iteración corta (un componente nuevo) — esto es para apps completas.
  Modelo sin tool-use (solo chat) — los pre-step pipelines requieren ejecución.
---

# Prompt Template Engineering

Patrón meta para escribir mega-prompts que producen apps premium en una sola pasada.

## Los 7 pilares (todos obligatorios)

### 1. Brief — target + success al INICIO

```markdown
## 0. BRIEF (read first, do not skip)

You are building [WHAT] in the spirit of [REFERENCES].

**Target stack — non-negotiable:**
- [tech 1]
- [tech 2]
...

**Design intent:**
- [property 1]
- [property 2]
- No [anti-pattern 1]
- No [anti-pattern 2]

**What success looks like:** [criterio de aceptación verificable, ej "npm run dev arranca al primer try, las 9 secciones renderean, hero scrub funciona, no console errors, LCP < 2.5s"]
```

Por qué: el modelo lee el brief y se calibra. Sin brief, M2.7 elige stack random.

### 2. Placeholders Legend — tabla única source of truth

```markdown
| Placeholder | Type | Example | Default |
|---|---|---|---|
| `{{LANG}}` | BCP-47 | `fr-CH` | `fr-CH` |
| `{{BRAND_NAME}}` | string | `ABP` | `Atelier` |
| `{{FRAME_COUNT}}` | int | `240` | `240` |
| ... |
```

Reglas:
- Cada `{{X}}` que aparece después en el doc DEBE estar en la tabla.
- Type explícito (string / int / array of {x,y} / hex / BCP-47).
- Example real, no abstracto.
- Default sensato si user no llena.

Por qué: evita que el modelo invente placeholders o use uno con typo.

### 3. Pre-step pipeline — deps externas explícitas

Si el proyecto requiere algo NO-código (extraer frames de video, descargar dataset, configurar DNS, generar API key):

```markdown
## 2. PRE-STEP — VIDEO → JPG FRAME PIPELINE

The hero uses scroll-scrubbed frame sequence, not `<video>`. User supplies ONE video, extracted to frames.

**Instructions (incluir en project README):**
\`\`\`bash
mkdir -p input public/frames
ffmpeg -i input/source.mp4 -vf "fps=30,scale=..." public/frames/frame_%04d.jpg
ls public/frames | wc -l  # paste in FRAME_COUNT
\`\`\`

**Rules:** [reglas específicas, ej zero-padded 4-digit, gitignore /input, total < 20MB]
**Fallback:** [si user no tiene la dep, ej `@ffmpeg/ffmpeg` WASM]
```

Por qué: el modelo no asume infra del cliente. Pipeline explícito = un solo source of truth.

### 4. Stack non-negotiable — versiones específicas

```markdown
## 3. PROJECT BOOTSTRAP

\`\`\`bash
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss@next @tailwindcss/vite
npm install motion lucide-react
npx shadcn@latest init -d
npx shadcn@latest add button accordion
\`\`\`
```

Reglas:
- Versiones EXACTAS (`@next`, `@latest`, o `^X.Y.Z`).
- Comandos EJECUTABLES (no "instala las deps", sino el comando literal).
- File structure ASCII tree.

Por qué: M2.7 a veces usa Next en vez de Vite si no se le dice. Stack explícito = no improvisa.

### 5. Anti-slop guardrails — 12-15 reglas concretas

```markdown
## 22. ANTI-SLOP GUARDRAILS (read before submitting)

Every violation = defect. Self-check before returning.

1. NO emoji anywhere.
2. NO default violet/purple gradients.
3. NO `shadow-2xl` en cards.
4. NO `rounded-3xl` en buttons (rounded-full).
5. NO placeholder lorem en final output.
6. NO `text-center` en body paragraphs (excepto hero/CTA).
7. Headings: display uppercase tracking-tight O display italic, never both.
8. Cada section: badge + heading + sub pattern.
9. Solo lucide-react icons.
...
15. A11y: focus-visible:ring + canvas aria-hidden + sr-only sibling.
```

Por qué: las reglas vagas ("código limpio", "diseño premium") fallan. Reglas concretas con examples = el modelo puede self-check.

### 6. Verification ejecutable

```markdown
## 23. VERIFICATION (run before declaring done)

**Build:**
- `npm run dev` → arranca sin error
- `npm run build` → 0 TS errors

**Visual:**
- Hero first paint < 300ms
- Marquee loop seamless
- 375px sin horizontal overflow

**Console:**
- 0 React warnings
- 0 frame URL 404s

**Perf:**
- Lighthouse Performance ≥ 85
- LCP < 2.5s
```

Por qué: el modelo mismo puede correr los checks (`npm run build`, browser screenshot via playwright). Si falla, sabe qué arreglar.

### 7. "No preguntes, ejecutá"

```markdown
## 24. FINAL NOTE TO THE GENERATING MODEL

You receive this entire document as one prompt. Do not ask clarifying questions. Do not trim sections. Do not substitute Next.js for Vite. Do not swap Framer Motion for GSAP. Do not skip [the critical thing] and replace it with [the easy thing] — that single decision is the difference between this being a great site and a generic one.

If a `{{PLACEHOLDER}}` is empty, leave a clearly visible `[TODO]` marker — don't invent plausible-sounding filler.

Build it.
```

Por qué: M2.7 (y otros) por default piden confirmación cuando hay ambiguity. Esto los autoriza a proceder.

## Patrones meta-meta — qué NO hacer

| Anti-pattern del prompt | Por qué falla | Fix |
|---|---|---|
| "Hacé una landing premium" | Modelo decide stack random | Stack explícito |
| Sin success criteria | Modelo no sabe cuándo terminó | Verification section |
| "Usa los colores que prefieras" | Output paleta cliché | Color tokens en placeholders |
| "Animations smooth" | Bouncy/elastic everywhere | Lista de easings permitidos |
| "Componentes premium" | Slop genérico | 9 secciones tipificadas con specs |
| "Buena a11y" | Olvidado | Reglas explícitas (focus rings, aria) |
| Sin pre-step | Modelo asume deps existen | Pipeline ffmpeg/etc completo |
| Trim por longitud | Modelo pierde reglas | Mega-prompt OK si es estructurado |

## Estructura recomendada (ToC)

```
0. Brief
1. Placeholders Legend (tabla)
2. Pre-step pipeline (si aplica)
3. Project Bootstrap (npm install + estructura)
4. Design Tokens (CSS variables)
5. Utility Classes (custom liquid-glass / etc)
6. Framework Config (tailwind, vite)
7. Component Variants (shadcn extensions)
8. Critical Components (con código completo)
9. Constants File
10-19. Sections (1 por archivo, especificación detallada)
20. Animation Patterns (recap)
21. Page Composition (App.tsx)
22. Anti-slop Guardrails
23. Verification
24. Final note
```

Total: 6,000-12,000 palabras. NO trimmable.

## Cuándo dividir en multi-prompt

Solo si el modelo tiene context window < 32k. Sino, mega-prompt one-shot es superior porque:
- Sin contexto perdido entre prompts.
- Sin re-prompting.
- Sin "olvidar" placeholders del brief.

Modelos con context > 32k que rinden bien con mega-prompts:
- Claude (Sonnet 4+ / Opus 4+): 200k context, óptimo
- MiniMax M2.7: 196k context, óptimo si las reglas están al INICIO
- GPT-5.x: idem
- Lovable / v0 / Cursor: depend del modelo subyacente

## Recursos

- Template ejemplo (cinematic landing): ver skill `cinematic-landing-template`
- Anti-slop principles: skill `minimax-anti-slop`
- Verification patterns: skill `qa`
