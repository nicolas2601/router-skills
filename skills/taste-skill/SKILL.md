---
name: taste-skill
description: Taste-Skill de Leonxlnx — colección de skills frontend agnostic-of-framework para evitar que la IA produzca interfaces aburridas. 3 parámetros ajustables (variance/motion/density). Variantes (taste-skill, gpt-taste, image-to-code, redesign).
type: design-quality
source: https://github.com/Leonxlnx/taste-skill
when_to_use: greenfield UI donde querés "taste" sin diseñador humano; redesign de UI existente con vibes premium; cuando el output default se siente "AI generic"
---

# Taste-Skill — Anti-Generic Frontend Generator

Taste-Skill ataca el problema "la IA produce UI genérica y aburrida" con un sistema de prompts + reglas que empuja a estilos modernos premium.

## Instalación

```bash
npx skills add https://github.com/Leonxlnx/taste-skill
```

O copy-paste del SKILL.md directo a tu proyecto / ChatGPT / Cursor / Claude Code.

## Variantes incluidas

| Variante | Para qué |
|----------|----------|
| `taste-skill` | Default — UI premium balanced |
| `gpt-taste` | Optimizada para GPT models |
| `image-to-code-skill` | Image → JSX/TSX siguiendo taste rules |
| `redesign-skill` | Refactor de UI existente con bump premium |
| `landing-skill` | Solo landings |
| `dashboard-skill` | Solo dashboards / data-dense |

## 3 parámetros ajustables

Al invocar la skill, configurá:

### 1. Variance (varianza de diseño)
- `low` — minimalista, restrained, editorial
- `medium` — modern SaaS standard
- `high` — bold, brutal, eye-catching

### 2. Motion (intensidad de movimiento)
- `none` — static, sin animations
- `subtle` — micro-interactions, fades, hovers
- `rich` — scroll-driven, parallax, choreographed

### 3. Density (densidad visual)
- `airy` — mucho whitespace, hero-driven
- `balanced` — SaaS estándar
- `dense` — dashboard / data-heavy / editorial

```
Skill("taste-skill", { variance: "medium", motion: "subtle", density: "airy" })
```

## Cuándo invocar

### Triggers naturales
- "haceme una landing con vibes premium"
- "no quiero algo aburrido"
- "como awwwards" / "como godly.website"
- Redesign de UI existente
- Image-to-code (screenshot → componente)

### NO usar
- Components ya tienen design system establecido (DESIGN.md formal)
- UI puramente funcional sin requisito estético (admin internal)
- Tarea es performance, no diseño

## Reglas core (lo que evita)

- Inter font como display
- Purple/indigo gradient genérico
- "Get Started" / "Learn More" CTAs
- 3 cards equal-width en row
- Hero + 3-col features + pricing + footer cookie-cutter
- border-radius 16px uniforme
- Gris en background colorido

## Reglas core (lo que prefiere)

- Editorial / asymmetric layouts
- Type-driven hierarchy (no todo en cards)
- Color con relaciones HSL coherentes (no hex random)
- Motion choreographed, no "todo a la vez"
- Brand-specific tokens > defaults

## Integración con kit

Stackeable con:
- `minimax-aesthetic-variation` — taste-skill propone, aesthetic-variation fuerza 3 variantes para comparar
- `minimax-reference-grounded` — taste-skill genera, reference-grounded valida contra refs del nicho
- `impeccable` — taste-skill produce, impeccable audita

**Workflow recomendado**:

```
1. Skill("taste-skill") con params definidos
2. Genera UI candidate
3. Skill("impeccable") /audit → score
4. Si score <7: Skill("minimax-design-loop") iterá
5. Final: anti-slop check
```

## Output

Cuando invocás `Skill("taste-skill", {...})`, el modelo produce:

- Componente con vocabulario premium (no generic patterns)
- Tokens extraíbles a DESIGN.md
- Self-rationale: "elegí esta tipo / color / motion porque <razón>"
- Anti-slop self-check: confirma que no usó Inter / blue→purple / "Build the future"

## Diferencia con `taste-design` skill (ya en kit)

| Aspecto | taste-skill | taste-design |
|---------|-------------|--------------|
| Scope | Frontend completo | Solo design system documents |
| Output | TSX/JSX código | DESIGN.md + tokens |
| Frameworks | Agnostic | Stitch ecosystem |
| Param config | Sí (variance/motion/density) | No |

Ambos son útiles — `taste-design` para documentar, `taste-skill` para generar.
