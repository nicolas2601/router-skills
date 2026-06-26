---
name: ai-website-cloner
description: Reconstruye cualquier website en Next.js moderno usando vision + parallel git worktrees. 5-fase pipeline (extract design tokens & assets → update fonts/colors → component specs → parallel build → assemble + visual validation). Slash `/clone-website <url>`.
type: workflow
source: https://github.com/JCodesMore/ai-website-cloner-template
when_to_use: el user pide "clonar" / "réplica" / "como X.com" un sitio público; rebuild moderno de un legacy site; investigar arquitectura de un sitio que admiramos; NO para infringir IP o producir clones públicos
---

# AI Website Cloner — Vision-Driven Rebuild

Este template clona cualquier website público en una codebase Next.js moderna usando vision + parallel agent execution.

## Instalación

```bash
git clone https://github.com/JCodesMore/ai-website-cloner-template my-clone
cd my-clone
npm install
```

Funciona con Claude Code (recomendado), Cursor, Windsurf, Gemini CLI, GitHub Copilot.

## Uso básico

```
/clone-website https://linear.app
```

El agente dispara el pipeline completo sin más intervención.

## Pipeline (5 fases)

```
1. EXTRACT
   • Screenshot del sitio (mobile + desktop)
   • Extracción de design tokens via vision (colors, fonts, spacing, radii)
   • Inventory de assets (imágenes, íconos, logos)

2. SHELL
   • Update tailwind.config.ts con tokens detectados
   • Importa fonts en layout.tsx
   • Genera CSS variables globales

3. SPEC
   • Genera spec por sección (hero, nav, features, footer, etc.)
   • Cada spec = README.md + visual reference + ASCII layout

4. PARALLEL BUILD
   • Crea git worktrees por sección
   • Spawn N sub-agentes (uno por sección)
   • Cada worker construye su sección en aislamiento

5. ASSEMBLE + VALIDATE
   • Merge de todos los worktrees
   • Wire routing + shared layout
   • Playwright screenshots vs original
   • Visual diff scoring
```

## Configuración

`config.json` en root del clone-template:

```json
{
  "target_url": "https://linear.app",
  "framework": "next-15-app-router",
  "styling": "tailwind-v4",
  "components": "shadcn",
  "viewports": [375, 768, 1280],
  "max_workers": 6,
  "vision_model": "claude-sonnet-4-6"
}
```

## Cuándo invocar esta skill

### SÍ usar
- "clonemos linear.app" → rebuild study con stack moderno
- "como vercel.com pero para mi SaaS" → inspirado-en clone
- "réplica de la landing de stripe.com en mi codebase"
- Migrar legacy site a Next 15 moderno
- Investigar la arquitectura visual de un sitio que querés emular

### NO usar
- Producir réplicas EXACTAS para deploy público (IP / trademark issues)
- Cuando el usuario quiere un sitio ORIGINAL — usá `minimax-premium-landing`
- Sitios que requieren auth (el clone funciona sobre páginas públicas)
- Sitios pesados en JS dinámico que no se ven en SSR (vision falla)

## Reglas de seguridad legal

1. **NO publiques** clones tal cual — son para study/inspiration
2. **Cambiá brand assets** (nombre, logo, copy, paleta) si vas a deploy
3. **No uses imágenes/videos** del original — re-generá con `Skill("nano-banana-pro")`
4. **Mencioná inspiración** si el clone es público (footer "inspired by X")

## Vision considerations

El template usa Claude vision por default (configurable). Para sitios complejos:

- Preferí **3 viewports** (mobile/tablet/desktop) en lugar de 1
- Capturá **above-fold** + scroll completo para hero+secciones
- Para componentes interactivos (modales, dropdowns), captura el estado abierto

## Integración con kit

Combina con:
- `minimax-design-md-system` — convertí los tokens detectados en DESIGN.md formal
- `minimax-design-loop` — fase 5 ya hace screenshot diff, pero podés iterar más con design-loop
- `Skill("nano-banana-pro")` — re-generá imágenes en lugar de usar las del original

## Output

Tras `/clone-website https://linear.app` en repo greenfield:

```
my-clone/
  app/
    page.tsx                ← Hero + Features + ...
    layout.tsx              ← Fonts, providers
  components/
    Hero.tsx                ← worker-1 build
    FeatureGrid.tsx         ← worker-2 build
    Pricing.tsx             ← worker-3 build
    Footer.tsx              ← worker-4 build
  public/
    icons/, logos/          ← extraídos vía vision
  tailwind.config.ts        ← design tokens
  DESIGN.md                 ← 9 secciones (mood, color, type, ...)
  __screenshots__/
    original/               ← target capture
    clone/                  ← nuestra build
    diff/                   ← Playwright visual diff %
```
