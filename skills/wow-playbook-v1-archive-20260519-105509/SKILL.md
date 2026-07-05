---
name: wow-playbook
description: "Playbook definitivo de frontend awwwards-level para AI. Consolida taste-skill (14 archetypes + 3 dials), impeccable (anti-slop laws), high-end-visual-design (variance engine), nexu-io/open-design (5 visual directions + 5-dim critique), frontend-design (BOLD direction), basementstudio/scrollytelling, Lenis + GSAP + Framer Motion 12 + R3F + Aceternity + Magic UI + Motion Primitives. 50+ trucos pro condensados. Use when designing, refactoring, or auditing any frontend interface."
---

# 🎯 WOW Playbook — Senior FE Engineer Knowledge Base

Consolidación de las mejores prácticas, patterns y trucos extraídos de skills oficiales (Anthropic, taste-skill, impeccable, high-end-visual-design, nexu-io/open-design, frontend-design), agencias top (basement.studio, Active Theory, Darkroom Engineering, Hyperstudio), librerías canónicas (Lenis, GSAP, Framer Motion, R3F, Aceternity, Magic UI, Motion Primitives), y catálogos de referencia (refero.design, awesome-design-md, awwwards SOTD).

**Si vas a construir, refactorizar o auditar UI, LEÉ esto primero.** El playbook supera a cualquier prompt one-shot.

---

## 1. LAS 18 LEYES ABSOLUTAS (anti-slop hardcoded)

### Code laws (1–8)
1. **0 inline styles** (`style={{...}}`). Solo Tailwind classes o CSS modules. Inline únicamente para valores dinámicos forzadamente JS-driven (ej: `--mouse-x: ${x}`).
2. **0 `element.style.transition` / `style.transform` strings en JS**. Usar GSAP `useGSAP` o Framer Motion `motion.*`.
3. **0 `setTimeout` / `setInterval` para animation timing**. GSAP `delay`, `requestIdleCallback`, o ScrollTrigger.
4. **0 `dynamic({ ssr: false })` above the fold**. Si WebGL, usar `<Suspense>` con fallback aesthetic-matching.
5. **0 `window.addEventListener('scroll')`**. Usar `IntersectionObserver` o ScrollTrigger.
6. **Animar SOLO `transform` y `opacity`**. Nunca `width/height/top/left/margin`.
7. **`backdrop-blur` SOLO en `fixed` o `sticky`**. Nunca scrolling containers.
8. **`min-h-[100dvh]` siempre**, nunca `h-screen` (iOS Safari catastrophic jump).

### Aesthetic laws (9–13)
9. **Fonts banned**: Inter, Roboto, Arial, Open Sans, Helvetica, system-ui como display. Usar: `Geist`, `Cabinet Grotesk`, `Clash Display`, `PP Editorial New`, `Plus Jakarta Sans`, `Satoshi`, `Outfit`, `Fraunces`, `Instrument Serif`, `Gambarino`, `Editorial New`, `Migra`, `Söhne`.
10. **Colors banned**: pure `#000` / pure `#fff` / generic Tailwind `gray-*`. Usar OKLCH tinted (chroma 0.005–0.01 al brand hue). Off-black `#0A0908`, off-white `#FDFBF7`.
11. **Shadows banned**: `shadow-md`, `shadow-lg`, `rgba(0,0,0,0.3)`. Usar multi-layer tinted o hairline `ring-1 ring-black/5` + inner highlight `inset 0 1px 1px rgba(255,255,255,0.15)`.
12. **Easing banned**: `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`. Usar `cubic-bezier(0.32, 0.72, 0, 1)` (Apple), `cubic-bezier(0.22, 1, 0.36, 1)` (rapid), `cubic-bezier(0.16, 1, 0.3, 1)` (expo.out), GSAP `expo.out` / `power3.out` / `power4.inOut`.
13. **UI patterns banned**:
    - Side-stripe `border-left` accents
    - `background-clip: text` gradient text
    - Glassmorphism como surface default
    - Hero-metric template (big number + small label + supporting stats + gradient)
    - 3-col equal cards (icon + heading + text repeated)
    - Centered hero cuando variance ≥ 4
    - "Scroll to explore" / bouncing chevrons
    - Modal como first thought
    - Fake metrics (`99.99%`, `124ms`, `18.5k`)
    - Em dashes (`—`) y `--`
    - AI clichés: "Elevate", "Unleash", "Seamless", "Next-Gen", "Cutting-edge"
    - `LABEL // YEAR` formatting
    - Generic stock names: "John Doe", "Acme", "Nexus"
    - Broken Unsplash links (usar `picsum.photos` o SVG avatars)

### Quality laws (14–18)
14. **`prefers-reduced-motion: reduce`** desactiva todo motion no esencial.
15. **Touch targets ≥ 44×44px**.
16. **Body line length 65–75ch**.
17. **Type scale ratio ≥ 1.25** entre steps. Nunca flat scales.
18. **Color contrast ≥ 4.5:1** body text.

---

## 2. ARCHETYPES (14 de taste-skill + 5 de nexu-io)

### Taste-skill canonical 14
| Archetype | Best for | Vibe |
|---|---|---|
| `brutalism` | Manifestos, art-tech | Raw, bold, confrontational |
| `cinematic-product` | Hardware launches | OLED black + bloom + dramatic reveals |
| `dark-luxe` | Premium SaaS, luxury | Moody, sensual, copper/gold accents |
| `dashboards` | SaaS analytics | Dense data, mono numerals, terminal |
| `editorial-premium` | Studios, fashion | Magazine, serif display, grain |
| `gallery-minimal` | Photographers | Image-led, exhibition pacing |
| `minimalism` | Startups, quiet products | Reduced, calm, high-clarity |
| `monochrome-modern` | Portfolios, agencies | Tight B/W + micro-accent |
| `premium-bento` | SaaS, AI products | Modular polished cards |
| `quiet-luxury` | Hospitality, wellness | Understated, soft, expensive restraint |
| `soft` | Consumer apps | Approachable, rounded, warm |
| `soft-brutalism` | Creator tools, culture | Bold structure + warm edges |
| `swiss-system` | Design brands, portfolios | Grid-led, typographic, institutional |
| `warm-modern` | Agencies, service brands | Human, polished, not sterile |

### Nexu-io 5 visual directions (deterministic palettes + fonts)
| Direction | OKLCH palette | Font stack |
|---|---|---|
| `editorial-monocle` | ink + cream + warm rust | Fraunces + Inter |
| `modern-minimal` | cool structured neutral | Geist + Geist Mono |
| `tech-utility` | monospace terminal greys | JetBrains Mono + Satoshi |
| `brutalist-experimental` | raw oversized contrast | Editorial New + system |
| `soft-warm` | peachy low-contrast | Outfit + Instrument Serif |

---

## 3. LOS 3 DIALS (taste-skill EQ system)

```
DESIGN_VARIANCE (1-10)  ─ layout asymmetry & grid-breaking
MOTION_INTENSITY (1-10) ─ animation density & ambition
VISUAL_DENSITY (1-10)   ─ spatial rhythm
```

**Baseline default**: `DV=7, MI=6, VD=5` (WOW alto: `DV=8, MI=9, VD=4`).

Cómo afectan:
- `DV 1-3` → centered, symmetric → `4-7` → offset asymmetric → `8-10` → diagonal/overlap/rotate
- `MI 1-3` → hover-only → `4-7` → scroll reveals + micro → `8-10` → pinned scrollytelling + WebGL
- `VD 1-3` → py-32 gallery → `4-7` → py-24 balanced → `8-10` → cockpit dense

---

## 4. STACK CANÓNICO 2026 (no negociable para WOW)

```bash
# Core
next@^15            # App Router
react@^19           # Server Components
typescript@^5
tailwindcss@^4      # con @theme tokens

# Motion (los 4 pilares)
lenis@^1.3          # smooth scroll - darkroomengineering
gsap@^3.13          # timeline + ScrollTrigger
@gsap/react@^2      # useGSAP hook
framer-motion@^12   # ahora motion package (motion-dev)
split-type@^0.3     # SplitText free alternative

# 3D / WebGL (si MI ≥ 7)
three@^0.168
@react-three/fiber@^9
@react-three/drei@^9
@react-three/postprocessing@^3
maath                # easing + math utils

# Component blocks (premium)
shadcn/ui            # base accesible
# +
# https://ui.aceternity.com  → 200+ motion components (3D cards, beams, magnetic, particles)
# https://magicui.design     → marketing micro (beams, retro grids, neon)
# https://motion-primitives.com → handcrafted sections
# https://21st.dev           → community blocks

# Utils
clsx + tailwind-merge       # cn() helper
@vercel/og                  # OG images
next/font                   # variable fonts local
```

---

## 5. SNIPPETS REUTILIZABLES (la spine non-negociable)

### `src/components/motion/LenisProvider.tsx`
```tsx
'use client';
import { ReactLenis } from 'lenis/react';
import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const update = (time: number) => ScrollTrigger.update(time);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => gsap.ticker.remove(update);
  }, []);

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: true,
        syncTouch: false,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      }}
    >
      {children}
    </ReactLenis>
  );
}
```

### `src/lib/motion.ts`
```ts
export const ease = {
  apple: [0.32, 0.72, 0, 1] as const,
  expo:  [0.16, 1, 0.3, 1] as const,
  quart: [0.22, 1, 0.36, 1] as const,
  back:  [0.34, 1.56, 0.64, 1] as const,
} as const;

export const stagger = {
  chars: 0.018, words: 0.05, lines: 0.08, cards: 0.1,
} as const;

export const duration = {
  micro: 0.2, short: 0.4, medium: 0.8, long: 1.2, hero: 1.6,
} as const;
```

### MagneticButton (GSAP quickTo)
```tsx
'use client';
import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

export function MagneticButton({ children, className, ...rest }: any) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'expo.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'expo.out' });
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
    };
    const onLeave = () => { xTo(0); yTo(0); };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
  }, []);
  return <button ref={ref} className={className} {...rest}>{children}</button>;
}
```

### SplitReveal (chars stagger + blur)
```tsx
'use client';
import { useGSAP } from '@gsap/react';
import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

export function SplitReveal({ children, className, stagger = 0.018, delay = 0 }: { children: string; className?: string; stagger?: number; delay?: number }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useGSAP(() => {
    if (!ref.current) return;
    const split = new SplitType(ref.current, { types: 'chars,words' });
    gsap.set(split.chars, { yPercent: 110, opacity: 0, filter: 'blur(8px)' });
    gsap.to(split.chars, {
      yPercent: 0, opacity: 1, filter: 'blur(0px)',
      duration: 1.2, ease: 'expo.out', stagger, delay,
      scrollTrigger: { trigger: ref.current, start: 'top 80%', once: true },
    });
    return () => split.revert();
  }, { scope: ref });
  return <h2 ref={ref} className={className}>{children}</h2>;
}
```

### NoiseOverlay (fixed, mix-blend)
```tsx
export function NoiseOverlay() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] opacity-[0.04] mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
      }}
    />
  );
}
```

### Doppelrand Card (nested architecture)
```tsx
// outer shell + inner core, concentric radii
<div className="rounded-[2rem] p-1.5 ring-1 ring-black/5 bg-black/5">
  <div className="rounded-[calc(2rem-0.375rem)] p-6 bg-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
    {children}
  </div>
</div>
```

### Button-in-Button trailing icon
```tsx
<button className="group rounded-full px-6 py-3 bg-foreground text-background flex items-center gap-2 transition-all duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
  <span>Continuar</span>
  <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center transition-all duration-[400ms] group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105">
    ↗
  </span>
</button>
```

### Eyebrow tag (microscopic pill)
```tsx
<span className="inline-flex rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-foreground/5 text-foreground/70">
  CHAPTER 01
</span>
```

### ScrollTrigger pin scrollytelling
```tsx
useGSAP(() => {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: sectionRef.current,
      start: 'top top',
      end: '+=200%',
      scrub: 1,
      pin: true,
      anticipatePin: 1,
    },
  });
  tl.from('.chart-bar', { scaleY: 0, stagger: 0.05, ease: 'power3.out' })
    .from('.headline', { yPercent: 100, opacity: 0 }, '<0.3')
    .to('.bg-grad', { opacity: 0 }, '>');
}, { scope: sectionRef });
```

### Mouse parallax (hero layers)
```tsx
useEffect(() => {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const onMove = (e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    gsap.to('.layer-back',  { x: x * -10, y: y * -6,  duration: 1.2, ease: 'expo.out' });
    gsap.to('.layer-mid',   { x: x * -20, y: y * -12, duration: 1.0, ease: 'expo.out' });
    gsap.to('.layer-front', { x: x *  30, y: y *  18, duration: 0.8, ease: 'expo.out' });
  };
  window.addEventListener('mousemove', onMove);
  return () => window.removeEventListener('mousemove', onMove);
}, []);
```

### Marquee infinito velocity-aware
```tsx
useGSAP(() => {
  const tween = gsap.to('.marquee-inner', {
    xPercent: -50, repeat: -1, ease: 'none', duration: 30,
  });
  ScrollTrigger.create({
    trigger: '.marquee',
    onUpdate: (self) => {
      const v = self.getVelocity() / -500;
      gsap.to(tween, { timeScale: 1 + Math.abs(v), duration: 0.5 });
    },
  });
}, []);
```

### R3F Hero canvas (con Suspense aesthetic fallback)
```tsx
'use client';
import { Canvas } from '@react-three/fiber';
import { Environment, Float, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Suspense, useState } from 'react';

export function HeroCanvas() {
  const [dpr, setDpr] = useState(1.5);
  return (
    <Canvas dpr={dpr} camera={{ position: [0, 0, 5], fov: 35 }}>
      <Suspense fallback={null}>
        <PerformanceMonitor onDecline={() => setDpr(1)}>
          <Environment preset="city" />
          <Float speed={1} rotationIntensity={0.3} floatIntensity={0.5}>
            {/* mesh */}
          </Float>
          <EffectComposer>
            <Bloom intensity={0.6} luminanceThreshold={0.6} />
            <Vignette eskil={false} offset={0.1} darkness={0.6} />
          </EffectComposer>
        </PerformanceMonitor>
      </Suspense>
    </Canvas>
  );
}
```

---

## 6. LIBRARIES MAP (cuál usar y cuándo)

### Motion / Animation
- **Lenis** (3kB, darkroomengineering) — smooth scroll. Industry standard 2026. Pareja obligatoria con ScrollTrigger.
- **GSAP 3** — timeline complex, scroll-driven, text effects. SplitText (paid) o split-type (free).
- **Framer Motion 12 / motion-dev** — React-first, micro-interactions, AnimatePresence, layout animations.
- **basementstudio/scrollytelling** — React wrapper sobre GSAP ScrollTrigger optimizado.
- **darkroomengineering/hamo** — React hooks utils (useMediaQuery, useFrame, etc).
- **motion.dev** (was Framer Motion) — production-ready React motion.

### 3D / WebGL
- **Three.js + R3F + Drei** — el stack default React.
- **basementstudio/shader-lab** — toolkit to stack shaders (dithering, glitch, gradients, patterns).
- **OGL** — alternative lightweight a Three.js, mejor performance.
- **curtains.js** — turn DOM elements en interactive WebGL planes.
- **Shader Park** — JS API para crear shaders procedurales sin GLSL puro.

### Component blocks (premium)
- **shadcn/ui** — base accesible (28k+ stars).
- **Aceternity UI** (ui.aceternity.com, 28k stars) — 200+ motion components: 3D cards, glowing beams, magnetic buttons, particle bg, hero parallax, container scroll, compare, meteors, glare-hover, metallic-paint.
- **Magic UI** (magicui.design) — marketing micro (animated beams, retro grids, neon gradients).
- **Motion Primitives** (motion-primitives.com) — handcrafted sections, 50+ templates Framer Motion.
- **21st.dev** — community blocks ready-to-use.
- **Tailark** — marketing landing blocks.
- **Origin UI** — advanced primitives.
- **Cult UI** — AI-product specific patterns.

### Design system references
- **awesome-design-md** (VoltAgent, 71k stars) — 57 DESIGN.md de marcas reales (Apple, Stripe, Linear, Anthropic, Notion).
- **nexu-io/open-design** (29.6k stars) — 71 brand systems + 19 skills + 5 deterministic visual directions.
- **refero.design** — 2000+ DESIGN.md searchables por brand/mood/color. MCP server disponible.
- **godly.website** — curado de sitios premium.
- **awwwards.com** — Site of the Day inspiration daily.

### Inspiration / Tutorials
- **Codrops (tympanus.net/codrops)** — tutorials avanzados WebGL, R3F, shaders, GSAP. La biblia.
- **basement.studio/services** — case studies.
- **2022.basement.studio/lab** — experiments.
- **lab.basement.studio** — current experiments.
- **active.tools** + **activetheory.net** — agency benchmark.

---

## 7. HERO PATTERNS (donde más fallan los AIs)

### Trick #1 — Inline image typography (taste-design signature)
> Embed small contextual photos/visuals directamente entre palabras/letras del headline. Imágenes inline a type-height, rounded, como puntuación visual.

```tsx
<h1 className="font-serif text-[clamp(64px,9vw,144px)] leading-[0.92]">
  Built for{' '}
  <span className="inline-block align-middle w-[1.1em] h-[1.1em] rounded-full overflow-hidden">
    <Image src="/photo.jpg" alt="" width={140} height={140} />
  </span>{' '}
  <em className="italic font-light">people</em>{' '}
  who care.
</h1>
```

### Trick #2 — Asymmetric Bento (no 3-col equal)
```tsx
<div className="grid grid-cols-12 grid-rows-[auto_auto] gap-4 md:gap-6">
  <Card className="col-span-12 md:col-span-8 row-span-2 min-h-[400px]" />
  <Card className="col-span-12 md:col-span-4 min-h-[180px]" />
  <Card className="col-span-12 md:col-span-4 min-h-[180px]" />
</div>
```

### Trick #3 — Z-axis cascade (overlap + rotation)
```tsx
<div className="relative">
  <Card className="absolute top-0 left-0 -rotate-2 z-10" />
  <Card className="absolute top-12 left-12 rotate-1 z-20" />
  <Card className="absolute top-24 left-24 -rotate-3 z-30" />
</div>
```

### Trick #4 — Editorial split (50/50 dramatic)
```tsx
<section className="grid md:grid-cols-2 min-h-[100dvh]">
  <div className="flex items-center px-8">
    <h1 className="font-serif text-[clamp(72px,12vw,200px)] leading-[0.9]">{headline}</h1>
  </div>
  <div className="overflow-x-auto snap-x snap-mandatory">
    {/* horizontal scroll cards */}
  </div>
</section>
```

### Trick #5 — Loader inicial real (no spinner)
3-5s con progress, contador number, easing custom. No spinner default.

### Trick #6 — Cursor blob (mix-blend-difference)
```tsx
<div ref={cursorRef} className="fixed top-0 left-0 w-8 h-8 rounded-full bg-white pointer-events-none z-[100] mix-blend-difference -translate-x-1/2 -translate-y-1/2" />
// GSAP quickTo para seguir mouse con lerp
```

---

## 8. THE 5-DIM SELF-CRITIQUE (nexu-io)

Antes de declarar "done", evaluá honestamente:

| Dim | Pregunta |
|---|---|
| **Philosophy** | ¿La pieza tiene un POV claro? ¿Se siente intencional? |
| **Hierarchy** | ¿Los ojos saben adónde ir? ¿Hay 1 foco por scene? |
| **Detail** | ¿Las micro-decisiones (hover, focus, easing) están pulidas o son defaults? |
| **Function** | ¿Los flujos funcionan? ¿La info más importante está accesible? |
| **Innovation** | ¿Hay 1 cosa que alguien va a recordar? ¿O es template? |

Si en cualquier dim el score honesto es < 7/10, **iterar**. No entregar.

---

## 9. PRE-DELIVERY CHECKLIST (Phase 7 audit)

Antes de decir "listo Nico":

### Visual
- [ ] No banned fonts/colors/shadows/eases (laws 9–12)
- [ ] No banned UI patterns (law 13)
- [ ] Variance archetype y layout archetype consciously selected
- [ ] Doppelrand en cards mayores (outer + inner concentric)
- [ ] CTAs usan button-in-button trailing icon
- [ ] Section padding mínimo `py-24` (VD-adjusted)
- [ ] Eyebrow tags presentes en H1/H2 mayores
- [ ] Type ratio ≥ 1.25 between steps

### Motion
- [ ] Solo `transform` + `opacity` animados
- [ ] Easing custom siempre (no ease-in-out)
- [ ] Scroll entry animations presentes (no aparece statically)
- [ ] Text reveals con SplitType/split-type chars stagger
- [ ] Magnetic buttons en CTAs
- [ ] `prefers-reduced-motion` respetado en TODO

### Performance
- [ ] Lighthouse perf ≥ 90 mobile
- [ ] CLS = 0
- [ ] LCP < 2.5s
- [ ] `backdrop-blur` solo en fixed/sticky
- [ ] Noise overlay en `fixed` pseudo-element
- [ ] Z-index disciplinado (no `z-[9999]` random)

### Responsive
- [ ] No horizontal scroll en 375px
- [ ] Multi-column → single-column < 768px
- [ ] `min-h-[100dvh]` no `h-screen`
- [ ] Touch targets ≥ 44px
- [ ] Typography clamp() fluid

### Accessibility
- [ ] Color contrast ≥ 4.5:1
- [ ] Focus visible siempre
- [ ] Alt text en imágenes meaningful
- [ ] Aria-labels en icon-only buttons
- [ ] Keyboard nav funcional
- [ ] Reduced-motion respetado

### Anti-slop (final filter)
- [ ] La impresión general lee como "$150k agency build", no "template con buenas fonts"
- [ ] Pasa el AI-slop test: si alguien dice "AI made that", FALLA
- [ ] Category-reflex check: no es la respuesta obvia para el dominio (no SaaS-cream para AI workflow, no navy-gold para fintech)

---

## 10. EL PROMPT MAESTRO (template canónico)

Cuando construyas wow desde cero, este es el prompt que la AI debe internalizar:

```
ROL: Senior Frontend Engineer at basement.studio / Active Theory tier. 10+ años de experiencia con GSAP, R3F, WebGL.

TAREA: Construir [SECTION] de [PROJECT]

CONTEXTO CARGADO:
- PRODUCT.md (audiencia, tono, anti-references)
- DESIGN.md (paleta, tipografía, motion philosophy, archetype)
- Reference URL: [si aplica]

ARCHETYPE: [chosen one of 14 + 5]
DIALS: DV=[n] MI=[n] VD=[n]

STACK NO NEGOCIABLE:
- Next 15 App Router + TS
- Tailwind v4 con @theme tokens
- Lenis 1.3 (ReactLenis)
- GSAP 3.13 + @gsap/react + ScrollTrigger
- split-type para text reveals
- Framer Motion 12 para micro
- R3F + Drei [si MI ≥ 7]

LEYES ABSOLUTAS:
[copiar las 18 leyes de Section 1]

REGLAS DE EJECUCIÓN:
1. Lee primero PRODUCT.md y DESIGN.md
2. Verificá tokens.ts y globals.css. Si no existen, los creás antes de cualquier scene.
3. Construí en orden: scaffold (sin motion) → motion → 3D → polish
4. STOP después de scaffold para screenshot checkpoint
5. Cada cambio respeta TODAS las 18 leyes
6. Si una decisión rompe una ley, frená y preguntá

ENTREGABLE:
- Código limpio, comentado solo donde el WHY no es obvio
- 0 inline styles
- 0 setTimeout para animations
- 0 dynamic ssr:false above-the-fold
- Self-critique 5-dim antes de entregar

REFERENCIA VISUAL EXACTA:
[paste URL or styles.refero.design/style/<id>]

PROHIBIDO TOTAL:
- Inter, Roboto, Arial, Helvetica
- pure #000, pure #fff
- shadow-md, shadow-lg
- ease-in-out, linear
- side-stripe borders
- 3-col equal cards
- "Scroll to explore"
- fake stats / em dashes / AI clichés

EMPEZAR.
```

---

## 11. SKILL CASCADE (orden de invocación)

| Phase | Skill principal | Skills secundarios |
|---|---|---|
| 0 Discovery | (AskUserQuestion) | — |
| 1 Reference | `design-md` + WebFetch | — |
| 2 Synthesis | `taste-design` + `ui-ux-pro-max` | `design-system`, `web-design-guidelines` |
| 3 Setup | `frontend-design` | `tailwind-design-system`, archetype-specific (`cinematic-landing-template`, `industrial-brutalist-ui`, `minimalist-ui`, `liquid-glass-design`) |
| 4 Scaffold | `frontend-design` + `high-end-visual-design` | `shadcn-ui`, `radix-ui-design-system`, `magic-mcp-21st` |
| 5 Motion | `gsap-scrolltrigger`, `gsap-timeline` | `motion-patterns`, `motion-advanced`, `locomotive-scroll`, `scroll-experience`, `gsap-performance` |
| 6 3D | `react-three-fiber` | `threejs-shaders`, `threejs-animation`, `threejs-interaction` |
| 7 Polish | `impeccable` (critique→polish) | `ui-visual-validator`, `taste-design`, `accessibility-compliance` |

---

## 12. CUANDO ALGO SALE PLANO (debug rápido)

| Síntoma | Causa probable | Fix |
|---|---|---|
| "Se ve plano" | Sombras = borders + colors generic | Sombras multi-layer tinted + paleta OKLCH |
| "No se siente premium" | Inter + ease-in-out + rounded-lg generic | Geist/Cabinet + cubic-bezier custom + rounded-[2rem] |
| "Falta movimiento" | useEffect + style.transition + setTimeout | GSAP useGSAP + SplitType + ScrollTrigger |
| "Animations chocan" | requestAnimationFrame + listeners scroll | Lenis + gsap.ticker integration |
| "Animations laggy mobile" | width/height/top/left animated | Solo transform + opacity, will-change selectivo |
| "Hero no impacta" | Centered + hero-metric template | Asymmetric + inline image typography + magnetic CTA |
| "Cards aburridas" | shadow-md + rounded-lg + same size | Doppelrand + asymmetric bento + concentric radii |
| "Se ve template" | 3-col equal cards + gradient text + glass | Z-axis cascade + solid color + grain overlay |
| "Inconsistente" | Estilos inline everywhere | tokens.ts + globals.css @theme + Tailwind classes |

---

## 13. FUENTES & REFERENCIAS

**Skills consolidados** (este playbook deriva de):
- `frontend-design` (Anthropic, 277k+ installs)
- `high-end-visual-design` (Vanguard_UI_Architect persona)
- `impeccable` (Apache 2.0, Anthropic-based)
- `taste-design` (Stitch-optimized)
- `ui-ux-pro-max` (50 styles, 21 palettes, 50 font pairings)
- `design-md` (Stitch-derived DESIGN.md generator)
- `design-orchestration` (meta-routing)
- `design-taste-frontend` / `taste-skill` (Leonxlnx, 13.3k stars)

**Repos externos clave**:
- `darkroomengineering/lenis` — smooth scroll standard 2026
- `basementstudio/scrollytelling` — React GSAP wrapper
- `basementstudio/shader-lab` — shaders stackables
- `nexu-io/open-design` (29.6k stars) — 71 systems + 19 skills + 5 visual directions
- `VoltAgent/awesome-design-md` (71k stars) — 57 brand systems
- `Leonxlnx/taste-skill` (13.3k stars) — 14 archetypes + 3 dials
- Aceternity UI (28k stars), Magic UI, Motion Primitives, 21st.dev

**Catálogos de inspiración**:
- styles.refero.design — 2000+ DESIGN.md searchable
- awwwards.com — SOTD diario
- godly.website — curated premium
- tympanus.net/codrops — tutoriales WebGL/R3F/GSAP avanzados

---

## INVOCACIÓN

Este playbook se invoca via:
```
Skill("wow-playbook")
```

Mejor: cargado al inicio por el agente `wow-frontend-orchestrator` (Agent tool, subagent_type custom).

Slash command rápido:
```
/wow [build|refactor|polish] [args]
```

**Si vas a tocar UI y no leíste este playbook primero, estás perdiendo tiempo.**
