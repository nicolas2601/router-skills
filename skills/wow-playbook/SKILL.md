---
name: wow-playbook
description: "Master knowledge base for /wow v2. Loaded by the orchestrator and every wow-* sub-agent. Contains the 18 anti-slop laws, 14+5 archetypes with baselines, 3 dials with jitter, variety/seed protocol, iteration modes, stack canonical 2026, recipe-mapping pointers, and the SDD integration contract. Sub-agents read this + their own role file."
---

# WOW Playbook v2 — Master

> v1 was a single-shot reference. v2 is a **swarm protocol**: this file plus archetype files plus style-recipes drive a 14-agent pipeline.

This document is the **source of truth** for every wow-* sub-agent. When in doubt, defer to this.

---

## 0. INVOCATION CONTRACT (recap)

`/wow <mode> <path> [URL_REF] [BRIEF]`

- `mode ∈ {build, refactor, polish, iterate}`
- `path` is the target project directory
- `URL_REF` optional reference site to extract design language from
- `BRIEF` optional free-text brief (parsed by wow-brief-parser)

The orchestrator (`wow-orchestrator-v2`) reads this and runs a 10-phase pipeline (P0–P9) with massive parallelism at P1, P3, P5, P6, P7, P8, P9.

---

## 1. THE 18 ABSOLUTE LAWS (anti-slop)

**Code laws (1–8) — HARD GREP ENFORCEMENT. 1+ match = FAIL.**

| # | Law | Grep |
|---|---|---|
| 1 | 0 inline styles | `style=\{\{` |
| 2 | 0 `element.style.transition` strings | `\.style\.transition` |
| 3 | 0 `setTimeout`/`setInterval` for animation | `setTimeout.*opacity\|transform` |
| 4 | 0 `dynamic({ ssr: false })` above-the-fold | `dynamic.*ssr:\s*false` |
| 5 | 0 raw `window.addEventListener('scroll'`) — use IntersectionObserver or ScrollTrigger | `addEventListener.*['"]scroll['"]` |
| 6 | Animate ONLY transform + opacity | search for animated `width\|height\|top\|left\|margin` |
| 7 | `backdrop-blur` only on fixed/sticky | grep `backdrop-blur` w/o `fixed\|sticky` |
| 8 | `min-h-[100dvh]` always, never `h-screen` | `h-screen` |

**Aesthetic laws (9–13)**

9. **Fonts banned**: Inter, Roboto, Arial, Open Sans, system-ui as display. Use: Geist, Cabinet Grotesk, Clash Display, PP Editorial New, Fraunces, Instrument Serif, Söhne, Migra, Gambarino, Plus Jakarta Sans, Satoshi, Outfit.
10. **Colors banned**: pure `#000`, `#fff`, generic `gray-*`. Use OKLCH-tinted off-black (`oklch(0.18 0.01 50)`), off-white (`oklch(0.98 0.005 80)`).
11. **Shadows banned**: `shadow-md`, `shadow-lg`, `rgba(0,0,0,0.3)`. Use hairline `ring-1 ring-black/5` + inner highlight + multi-layer tinted.
12. **Easing banned**: `linear`, `ease-in-out` defaults. Use `cubic-bezier(0.32, 0.72, 0, 1)` (Apple), `cubic-bezier(0.65, 0, 0.35, 1)` (smooth), GSAP `expo.out`, `power3.inOut`.
13. **UI patterns banned**:
    - Side-stripe `border-l-4` accents
    - `bg-clip-text` gradient text as default
    - Glassmorphism as surface default
    - Hero-metric template (big number + label + 3 stats row)
    - 3-col equal cards as default layout
    - Centered hero if DV≥4
    - Fake metrics (`99.99%`, `124ms`, `18.5k+`) without source
    - AI clichés: "Elevate", "Unleash", "Seamless", "Next-Gen", "Empower", "Revolutionize"
    - Bouncing chevrons, "Scroll to explore" prompts
    - Em dashes as decoration

**Quality laws (14–18)**

14. `@media (prefers-reduced-motion: reduce)` disables non-essential motion
15. Touch targets ≥44×44px
16. Body line length 65–75ch
17. Type scale ratio ≥1.25 between steps
18. Color contrast ≥4.5:1 for body text

---

## 2. ARCHETYPES (14 taste-skill + 5 nexu-io directions)

Each archetype has its own file in `archetypes/<name>.md` with **baseline DV / MI / VD**, palette, typography, motion profile, component vocabulary, "when to use", and forbidden patterns.

### Taste-skill archetypes (`archetypes/<name>.md`)

| Archetype | Baseline DV/MI/VD | When to use |
|---|---|---|
| `brutalism` | 6 / 2 / 3 | Raw, poster-led, confrontational. Cultural, music, fashion |
| `cinematic-product` | 7 / 8 / 4 | OLED black + bloom. Hardware launches, premium SaaS launches |
| `dark-luxe` | 5 / 6 / 5 | Moody, sensual. Luxury brands, premium SaaS |
| `dashboards` | 4 / 1 / 8 | Dense data, mono numerals, terminal-like |
| `editorial-premium` | 5 / 2 / 4 | Magazine, serif display. Studios, fashion editorial |
| `gallery-minimal` | 4 / 3 / 2 | Image-led exhibition pacing. Photographers, artists |
| `minimalism` | 3 / 2 / 3 | Reduced, calm, high-clarity. Startups, quiet products |
| `monochrome-modern` | 5 / 4 / 5 | Tight B/W + micro-accent. Portfolios, agencies |
| `premium-bento` | 6 / 6 / 6 | Modular polished cards. SaaS, AI products |
| `quiet-luxury` | 4 / 3 / 4 | Understated, soft, expensive restraint. Hospitality, wellness |
| `soft` | 3 / 3 / 4 | Approachable, rounded, warm. Consumer apps, education |
| `soft-brutalism` | 6 / 4 / 4 | Bold structure + warm edges. Creator tools, culture |
| `swiss-system` | 4 / 1 / 5 | Grid-led, typographic, institutional. Design brands |
| `warm-modern` | 5 / 5 / 5 | Human, polished, not sterile. Agencies, service brands |

### Nexu-io visual directions (ALIASES, not separate files)

These 5 directions are categorical aliases that map to existing taste-skill archetypes. The selector treats them as hint synonyms, NOT as separate archetype files.

| Direction | Maps to taste archetype(s) |
|---|---|
| `editorial-monocle` | `editorial-premium` |
| `modern-minimal` | `minimalism` or `swiss-system` |
| `tech-utility` | `dashboards` or `monochrome-modern` |
| `brutalist-experimental` | `brutalism` or `soft-brutalism` |
| `soft-warm` | `soft` or `warm-modern` |

If a brief uses a nexu-io direction name, the selector resolves it to the mapped taste-skill archetype(s) and uses the corresponding file in `archetypes/`. There is no `archetypes/editorial-monocle.md` etc. — do NOT try to read those paths.

> **Rule**: never combine more than 2 archetypes. Hybrids must be explicit (e.g., `editorial-premium × warm-modern` for a financial editorial).

---

## 3. THE 3 DIALS

Every build is parameterized by these three values, each 1–10:

- **DV — DESIGN_VARIANCE**: layout asymmetry, grid-breaking, scene-led composition
- **MI — MOTION_INTENSITY**: animation density and ambition; gates 3D
- **VD — VISUAL_DENSITY**: information per viewport, spatial rhythm

| Dial | 1–3 | 4–7 | 8–10 |
|---|---|---|---|
| DV | Centered, symmetric, predictable | Asymmetric, offset, mixed scale | Diagonal/overlap, poster-like |
| MI | Hover-only, rely on states | Scroll reveals, micro-interactions, stagger | Pinned scrollytelling, WebGL, magnetic interactions |
| VD | Gallery mode, py-32, high whitespace | Balanced, py-24 (default) | Cockpit-dense, tabular numerals, tight spacing |

### Dial inheritance order

1. User explicit (`MI=9 DV=8 VD=4` in invocation) → wins
2. Archetype baseline (from table above) → fallback
3. **Dial jitter** (NEW v2): if no user override, the orchestrator applies ±2 deterministic jitter from the seed (clamped 1–10) so two runs of the same archetype produce different builds.

**MI gates**:
- MI≥7 → 3D allowed, `wow-3d-specialist` may spawn
- MI≥8 → pinned scrollytelling chapters required
- MI≤3 → animations restricted to hover + fades

---

## 4. SEED & VARIETY PROTOCOL (NEW v2)

This is the **anti-template-loop machine**.

### 4.1 Seed generation

```ts
seed = sha256(`${projectPath}::${YYYYMMDD-HHMMSS}::${counter}`).slice(0,16)
```

Stored in `~/.claude/.wow-state/state.json` after each run. Used to derive:
- archetype pool ordering
- dial jitter (±2)
- component variant selection inside recipe
- copy-direction selection

### 4.2 Archetype pool (NEW)

The `wow-archetype-selector` agent does NOT pick one — it picks **3 candidates** ranked by fit to brief signals + variety penalty:

```
candidates = top_3(fit_score(brief, archetype) - variety_penalty(archetype, history))
```

`variety_penalty` adds +0.3 to any archetype used in the last 5 builds of the same project (in `history.jsonl`). Result: same project = different archetypes each time unless the user pins one.

### 4.3 Variety memory

`~/.claude/.wow-state/history.jsonl` — one JSON per build:

```json
{"ts":"2026-05-19T10:55:09Z","project":"/Documentos/JULIAN/web","seed":"a1f2…","archetype":"editorial-premium","dials":{"DV":8,"MI":9,"VD":4},"audit":"PASS"}
```

The orchestrator reads the last 5 entries for the project and forbids:
- Re-using the same archetype 2 builds in a row (unless `--pin-archetype`)
- Re-using the same component-recipe combination
- Re-using the same hero composition layout

### 4.4 User signal "you did the same thing"

If the user says "you keep doing the same thing", "this is the same as last time", "no real change" → the iteration-coordinator forces:
1. Bump variety penalty to +0.6 for current archetype
2. Re-roll archetype from pool
3. Force dial jitter ±3 (clamped 1–10)
4. Force a different component-recipe permutation

This is the **anti-loop circuit breaker**.

---

## 5. ITERATION MODES (NEW v2)

When mode = `iterate`, the orchestrator routes to `wow-iteration-coordinator` which classifies the change:

| Mode | Trigger phrases | What runs |
|---|---|---|
| `cosmetic` | "color", "spacing", "font", "smaller", "bigger", "darker" | tokens-only update + 1 scaffold-builder per affected scene |
| `motion` | "more motion", "less motion", "remove animation X" | motion-choreographer fan-out per affected scene |
| `structural` | "rearrange", "new section", "remove section", "different layout" | scene-architect + scaffold-builder fan-out |
| `archetype-shift` | "totally different", "you did the same thing", "fresh take" | full pipeline from P2 (archetype-selector) with variety penalty boost |

Versioned output: `DESIGN_v1.md`, `DESIGN_v2.md`, etc. with a `CHANGELOG.md` in the project root summarising what changed and why.

Single fact: every iteration writes a new DESIGN file. Never overwrite the previous one.

---

## 6. CANONICAL STACK 2026

Locked. Do not substitute.

```jsonc
{
  "next": "^15",                  // App Router + Server Components
  "react": "^19",                 // Suspense + lazy
  "typescript": "^5",
  "tailwindcss": "^4",            // @theme tokens
  "lenis": "^1.3",                // smooth scroll
  "gsap": "^3.13",                // timelines, ScrollTrigger
  "@gsap/react": "^2",            // useGSAP
  "framer-motion": "^12",         // imperative motion
  "split-type": "^0.3",           // SplitText alternative
  "three": "^0.168",              // if MI≥7
  "@react-three/fiber": "^9",
  "@react-three/drei": "^9",
  "@react-three/postprocessing": "^3",
  "clsx": "^2",
  "tailwind-merge": "^2"
}
```

Optional libraries to **reference** (component recipes, not deps unless adopted):
- shadcn/ui · Aceternity UI · Magic UI · Motion Primitives · 21st.dev · React Bits

---

## 7. RECIPE MAPPING (the v2 upgrade)

The file `components/style-recipes.md` (sibling of this SKILL.md) maps each archetype → specific components from the 4 reference libraries. Sub-agents (especially `wow-design-synthesizer` and `wow-scaffold-builder`) MUST read it.

Example mapping (full table in `components/style-recipes.md`):

| Archetype | Hero recipe | Card recipe | Background | Motion seed |
|---|---|---|---|---|
| brutalism | poster hero + directional marquee | raw card stack | concrete texture | hard cuts, no smooth |
| editorial-premium | serif display + image | editorial bento | hairline frame | text masking, subtle |
| premium-bento | bento grid + 3D pin | focus-cards | mesh gradient | layout transitions |
| cinematic-product | image sequence | apple-cards-carousel | bloom background | scroll scrub WebGL |

Sub-agents pick variants from a recipe with seed RNG (never hardcoded).

---

## 8. SDD INTEGRATION

When mode is `build` or `refactor`, the orchestrator MUST run SDD phases through `sdd-orchestrator`:

```
explore (parallel with reference-extractor) → propose → spec ‖ design → tasks
```

`spec` and `design` can parallelize (no hard dep) — v1 ran them serial which blocked the pipeline.

Tasks output feeds `wow-scene-architect`, which fans out scaffold-builders.

For `polish` and `iterate` modes, SDD is optional and may be skipped.

---

## 9. SUB-AGENT ROSTER (14 agents)

| Role | Agent | Phase | Parallel? |
|---|---|---|---|
| Reference extractor | `wow-reference-extractor` | P1 | ‖ |
| Brief parser | `wow-brief-parser` | P1 | ‖ |
| Codebase scanner | `wow-codebase-scanner` | P1 | ‖ |
| Archetype selector | `wow-archetype-selector` | P2 | — (single) |
| Design synthesizer | `wow-design-synthesizer` | P3 | ‖ (with sub-tasks) |
| Scene architect | `wow-scene-architect` | P5 | — (single, fans out next) |
| Scaffold builder | `wow-scaffold-builder` | P5 | ‖ (1 per scene) |
| Motion choreographer | `wow-motion-choreographer` | P6 | ‖ (1 per scene) |
| 3D specialist | `wow-3d-specialist` | P7 | ‖ (only if MI≥7) |
| Code laws auditor | `wow-code-auditor` | P8 | ‖ |
| Aesthetic auditor | `wow-aesthetic-auditor` | P8 | ‖ |
| A11y auditor | `wow-a11y-auditor` | P8 | ‖ |
| Taste validator | `wow-taste-validator` | P8 | ‖ |
| Iteration coordinator | `wow-iteration-coordinator` | P9 / mode=iterate | — |

Each agent file lives in `~/.claude/agents/custom/wow-*.md`.

---

## 10. ANTI-PATTERN TABLE (for every sub-agent)

| Anti-pattern | Why | Fix |
|---|---|---|
| Inline styles | Law 1 | Tailwind classes + CSS variables |
| `element.style.transition = "..."` | Law 2 | GSAP `useGSAP` hook or Framer Motion `<motion.div>` |
| `setTimeout` for animation timing | Law 3 | GSAP `delay:` / Framer Motion `transition.delay` |
| `dynamic(ssr:false)` for hero | Law 4 | `<Suspense>` + aesthetic skeleton (not spinner) |
| `window.addEventListener('scroll', ...)` | Law 5 | `IntersectionObserver` or GSAP `ScrollTrigger` |
| Animating `width` / `height` / `top` / `left` / `margin` | Law 6 | Transform + opacity only |
| `backdrop-blur` on scrolling containers | Law 7 | Only on `fixed` / `sticky` elements |
| `h-screen` | Law 8 | `min-h-[100dvh]` (iOS Safari jump) |
| Centered hero with DV≥4 | Law 13.f | Asymmetric grid, off-axis composition, scene-led layout |
| Hero-metric template (big number + 3-stat row) | Law 13.d | Editorial title + supporting ratio cards |
| 3-col equal cards as default layout | Law 13.e | Bento with mixed cell sizes or editorial bento |
| `bg-clip-text` gradient text | Law 13.b | Single-tone display headline; reserve color for one accent surface |
| `border-l-4` side-stripe accent | Law 13.a | Hairline `ring-1 ring-black/5` or proper card chrome |
| Glassmorphism as surface default | Law 13.c | Hairline + subtle inner highlight; glass only on `fixed` overlay |
| Fake metrics (`99.99%`, `124ms`, `18.5k+`) | Law 13.g | Real data with source citation, or remove |
| Pure `#000` / `#fff` / generic `gray-*` | Law 10 | OKLCH tinted off-black `oklch(0.18 0.01 50)` and off-white `oklch(0.98 0.005 80)` |
| `Inter` / `Roboto` / `Open Sans` / `system-ui` as display | Law 9 | Geist (via `@vercel/geist-font`), Cabinet Grotesk, Clash Display, PP Editorial New, Fraunces, Instrument Serif, Söhne, Migra, Gambarino |
| `import { Geist } from "next/font/google"` | Build error | Use `import { GeistSans } from "geist/font/sans"` (Vercel package) or `next/font/local` |
| `gray-500` body text | Law 10 + 18 | OKLCH tinted secondary with contrast ≥4.5:1 |
| `shadow-md` / `shadow-lg` / `rgba(0,0,0,0.3)` | Law 11 | Hairline `ring-1 ring-black/5` + multi-layer tinted shadow |
| `linear` / `ease-in-out` defaults | Law 12 | `cubic-bezier(0.32, 0.72, 0, 1)` (Apple) or GSAP `expo.out` / `power3.inOut` |
| AI cliché copy: "Elevate", "Unleash", "Seamless", "Next-Gen", "Empower", "Revolutionize" | Law 13.h | Concrete verbs, specific nouns, evidence |
| Decorative em dashes as separators | Law 13.j | Plain commas or rewrite |
| Bouncing chevrons / "Scroll to explore" prompts | Law 13.i | Implicit scroll affordance (whitespace + content cutoff) |
| Emoji icons in production UI | Visual noise | Phosphor Icons, Radix Icons, Lucide |
| Purple-to-pink gradient (default AI palette) | Law 10 + slop signature | One restrained accent color from archetype palette |
| `<div className="container mx-auto px-4">` everywhere | Generic | Archetype-specific container with editorial offsets |

---

## 11. WHEN TO READ WHAT

| Reading you need | File |
|---|---|
| Archetype details (palette, typography, motion, components) | `archetypes/<name>.md` |
| Recipe mapping archetype → component variants | `components/style-recipes.md` |
| Variety modes deep dive | `recipes/variety-modes.md` |
| 3D / shader recipes | `recipes/3d-shaders.md` |
| GSAP scroll patterns | external `Skill(gsap-scrolltrigger)` |
| Three.js shaders | external `Skill(threejs-shaders)` |

---

## 12. FINAL CHECKLIST FOR ANY BUILD

A WOW build is done when ALL of these pass:

- [ ] 18 laws audit: PASS (hard) or NEEDS_ITERATION (soft) with fix-list (covered by `wow-code-auditor` + `wow-aesthetic-auditor` + `wow-a11y-auditor`)
- [ ] 5-dim taste critique ≥ 7/10 per dim (Philosophy, Hierarchy, Detail, Function, Innovation) — covered by `wow-aesthetic-auditor`
- [ ] anti-slop score ≥ 70 — covered by `wow-taste-validator`
- [ ] Motion-perf checks: no setTimeout, no element.style.transition, no width/height animations, prefers-reduced-motion respected — covered by `wow-motion-choreographer` in `MODE=perf-audit`
- [ ] DESIGN_vN.md written by synthesizer + audit footer appended by P9 + history.jsonl appended
- [ ] CHANGELOG.md updated if mode = iterate

> **Note**: Runtime perf (Lighthouse, console errors, hydration warnings) is OUTSIDE the static audit scope. Run those manually after `npm run dev` / `npm run build`. The pipeline does not gate on them because no sub-agent boots a browser.

If any fails → orchestrator spawns fix-agents in parallel, retries up to 2 cycles, then surfaces residual issues to user.
