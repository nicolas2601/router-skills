---
name: cinematic-landing-template
description: Template completo para landing premium estilo Apple/Stripe/Sony Bravia con 9 secciones tipificadas (navbar pill liquid-glass + hero scroll-scrub canvas + services bento asimétrico + why-us 4-col + process numbered + stats video bg + testimonials marquee dual + FAQ 2-col + CTA cinematic + footer). Stack obligatorio Vite + React 18 + TS + Tailwind v4 + shadcn/ui + Framer Motion + lucide-react + @fontsource. Trigger landing premium cinematográfica, apple-style, scroll-scrub video, hero canvas, awwwards-grade landing.
when_to_use: |
  Cliente pide "landing premium tipo Apple AirPods Pro / Stripe / Sony Bravia".
  Necesitás scroll-scrubbed video hero (canvas frame sequence, no `<video>`).
  Sitio editorial cinematográfico con 9 secciones tipificadas.
  Stack confirmado Vite + React (no Next.js, no Astro).
when_NOT_to_use: |
  Sitio Next.js — usar skill `next-15-app-router` + adaptar.
  Sitio content-heavy / blog — usar `astro` skill.
  Mobile RN — N/A.
  Cliente no quiere scroll-scrub (regular `<video>` basta).
---

# Cinematic Landing Template

Template prescriptivo para landing premium con scroll-scrub canvas hero. Inspirado en Apple AirPods Pro, Stripe, Sony Bravia.

## Stack obligatorio (no sustituir)

```bash
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss@next @tailwindcss/vite @tailwindcss/postcss autoprefixer
npm install motion lucide-react
npm install @fontsource/{display-font} @fontsource/{body-font}
npx shadcn@latest init -d
npx shadcn@latest add button accordion
```

## Estructura de archivos

```
src/
  App.tsx
  main.tsx
  index.css                  # design tokens + Tailwind @theme + liquid-glass utilities
  components/
    ScrubSequence.tsx        # canvas frame renderer (CRÍTICO)
    BlurText.tsx             # word-stagger headline (CRÍTICO)
    Navbar.tsx               # floating liquid-glass pill
    Hero.tsx                 # scroll-scrub canvas + headline + CTAs
    ServicesBento.tsx        # 6-card asymmetric bento
    Pourquoi.tsx             # 4-col why-us grid
    Process.tsx              # 3-4 step numbered horizontal flow
    Stats.tsx                # video bg + 4 stats con count-up
    Testimonials.tsx         # 2 rows marquee opposite directions
    Faq.tsx                  # 2-col layout (sticky title + accordion)
    CtaFooter.tsx            # cinematic video bg + CTA + footer bar
    ui/
      button.tsx             # con variants hero, heroGlass, heroSolid
      accordion.tsx
  lib/
    utils.ts
    constants.ts             # FRAME_COUNT, FRAMES_PATH, FRAME_EXT
public/
  frames/                    # frame_0001.jpg ... frame_NNNN.jpg
```

## Las 9 secciones — patrones obligatorios

### 1. Navbar (floating liquid-glass pill)
- `fixed top-4 left-1/2 -translate-x-1/2 z-50` con `liquid-glass rounded-full px-2 py-2`
- 3 zonas: logo+brand (left) | nav links center (md+) | CTA (right)
- Scroll > 40px: `top-4 → top-2` + `backdrop-blur-xl`
- Mobile: hamburguer + sheet full-screen liquid-glass

### 2. Hero (scroll-scrub canvas)
- `<section ref={scrollRef} className="relative h-[250vh]">` (250vh da scroll para frame seq)
- `<div className="sticky top-0 h-screen overflow-hidden">` para pin
- Canvas absoluto inset-0 z-0
- Vignette radial gradient z-1
- Bottom fade z-2 hacia siguiente section
- Content (badge + BlurText H1 + sub + CTAs + partners marquee) z-10

### 3. ServicesBento (asimétrico 6 cards)
- Grid `md:grid-cols-3 gap-5`
- Card 0: tall `row-span-2`
- Cards 1-2: small
- Card 3: wide `col-span-2`
- Card 4: small
- Card 5: full-width `col-span-3`
- Cada card: `liquid-glass rounded-2xl` + icon en `liquid-glass-strong rounded-full size-11` + display heading + body 38ch + ArrowUpRight top-right

### 4. Pourquoi (4-col why-us)
- Grid `lg:grid-cols-4 gap-5 mt-16`
- Cada card: liquid-glass + icon + display title + body 30ch + accent line bottom

### 5. Process (numbered horizontal)
- `md:grid-cols-4 gap-0` (gap-0 porque conectores fill the gap)
- Numero gigante `text-[140px] text-primary/25` overlapping
- Conector horizontal: `absolute top-20 -right-0 h-px w-full bg-gradient-to-r from-border via-border to-transparent`

### 6. Stats (video bg + count-up)
- Video bg `filter saturate(0)` desaturado
- Top + bottom 200px gradient fades
- Card central liquid-glass `rounded-3xl p-14`
- 4 stats: value `font-display italic text-7xl` + label `uppercase tracking-wide text-sm`
- Animar count desde 0 con motion cuando entra a viewport

### 7. Testimonials (2 marquee rows)
- Row 1: `animate-[marquee_28s_linear_infinite]`
- Row 2: `animate-[marquee-rev_32s_linear_infinite]` (opposite direction)
- Mask: `[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]`
- Pause on hover: `hover:[animation-play-state:paused]`

### 8. FAQ (2-col layout)
- Grid `md:grid-cols-[0.9fr_1.1fr] gap-16`
- Left: sticky `md:sticky md:top-24` con badge + display heading + paragraph + button
- Right: shadcn Accordion con items styled

### 9. CTA + Footer
- Video bg `filter brightness(0.55)` (NO saturate-0 acá, vs Stats)
- Headline `font-display italic text-[180px]` (NO uppercase acá — italic es otro estilo)
- Footer: border-t + copyright + footer links

## Design tokens (index.css)

```css
@import "@fontsource/{display-font}/400.css";
@import "@fontsource/{display-font}/700.css";
@import "@fontsource/{body-font}/400.css";
@import "tailwindcss";

:root {
  /* Raw palette HSL triplets (sin hsl() wrapper para alpha en Tailwind) */
  --ink:    20 15% 9%;
  --cream:  40 30% 90%;
  --ochre:  32 55% 65%;
  --terra:  14 55% 31%;

  /* Semantic */
  --background: var(--ink);
  --foreground: var(--cream);
  --primary: var(--ochre);
  --secondary: var(--terra);
  --muted: 240 4% 16%;
  --muted-foreground: 40 6% 72%;
  --border: 40 30% 90% / 0.18;
  --ring: var(--ochre);
  --radius: 0.75rem;

  /* Typography */
  --font-display: "Oswald", "Impact", sans-serif;
  --font-body: "Inter", -apple-system, sans-serif;

  /* Layout */
  --gutter: clamp(20px, 4.2vw, 56px);
  --max: 1440px;
}

@theme {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-primary: hsl(var(--primary));
  /* ... resto de tokens semánticos */
  --animate-marquee: marquee 28s linear infinite;
  --animate-marquee-rev: marquee-rev 32s linear infinite;
}

@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
@keyframes marquee-rev { from { transform: translateX(-50%) } to { transform: translateX(0) } }
```

## Liquid-glass utilities (`@layer components`)

```css
.liquid-glass {
  background: rgba(255,255,255,0.01);
  background-blend-mode: luminosity;
  backdrop-filter: blur(4px);
  border: none;
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.1);
  position: relative;
  overflow: hidden;
}
.liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(180deg,
    rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
    rgba(255,255,255,0)    40%, rgba(255,255,255,0)    60%,
    rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  pointer-events: none;
}
.liquid-glass-strong { /* idem pero blur(50px) + box-shadow más fuerte */ }
```

## Animaciones — 5 primitivas (NO inventar nuevas)

1. **BlurText** (headings): word-stagger 0.07s, 0.7s duración por palabra, easing `[0.22, 1, 0.36, 1]`
2. **Fade-up-on-view** (subtext, CTAs): `initial={{opacity:0, y:16, filter:"blur(8px)"}}`, `whileInView={{opacity:1, y:0, filter:"blur(0)"}}`, `viewport={{once:true, amount:0.3}}`
3. **Scroll-scrub canvas** (hero only): pattern Apple AirPods Pro. Ver skill `scroll-scrub-canvas`.
4. **Marquee** (partners, testimonials): 28s/32s opposite directions, gradient mask edges, pause on hover
5. **Liquid-glass `::before` border** (cards, pills, buttons): NUNCA reemplazar con border CSS regular

## Anti-slop guardrails (15 reglas — read before submitting)

1. NO emoji anywhere (ni copy, ni cards, ni botones)
2. NO violet/purple default gradients (palette is warm: ochre + terra + cream + ink)
3. NO `shadow-2xl` en cards (depth = backdrop blur, no drop shadow)
4. NO `rounded-3xl` en buttons → buttons `rounded-full`, cards `rounded-2xl`
5. NO `lorem ipsum` placeholder dejado (usar `[TODO: {{PLACEHOLDER}}]` visible)
6. NO `text-center` en body paragraphs (excepto hero + CTA — son su propio mundo)
7. Headings: `font-display uppercase tracking-tight` O `font-display italic` (nunca ambos en mismo elemento)
8. Cada section: badge + heading + sub pattern (excepto hero y footer)
9. Solo `lucide-react` icons (no heroicons, no Material, no custom SVG salvo user supplied)
10. NO `<video>` para hero — hero es canvas. `<video>` solo en Stats y CTA backgrounds.
11. NO `motion.div` con `transition={{ duration: > 0.9 }}`
12. NO console.log, ni código comentado, ni archivos vacíos, ni imports unused
13. Copy en `{{LANG}}` — no auto-traducir placeholders
14. Responsive: 1440 desktop canvas, 375px mobile (iPhone SE) sin horizontal scroll
15. A11y: focus-visible:ring-2 ring-ring offset-2 offset-background, canvas aria-hidden, sr-only sibling describe video

## Verificación pre-delivery

```bash
npm run dev   # starts no error
npm run build # 0 TS errors, 0 Vite errors

# Visual checks:
# - Hero first paint < 300ms (priority preload frame_0001)
# - Scrub no stall > 50ms
# - Marquee loop seamless (duplicate array, midpoint invisible)
# - FAQ accordion smooth height
# - Navbar reduces top-4→top-2 al scroll > 40px
# - 375px sin horizontal overflow

# Console:
# - 0 React warnings
# - 0 frame URL 404s

# Perf:
# - Lighthouse Performance ≥ 85
# - LCP < 2.5s (preload frame_0001 con <link rel="preload">)
```

## Frame extraction pipeline

```bash
mkdir -p input public/frames

ffmpeg -i input/source.mp4 \
  -vf "fps=30,scale='min(1920,iw)':'-2':flags=lanczos" \
  -q:v 3 \
  public/frames/frame_%04d.jpg

ls public/frames | wc -l  # paste en FRAME_COUNT
```

WebP optional (~40% más chico):
```bash
for f in public/frames/*.jpg; do
  cwebp -q 82 "$f" -o "${f%.jpg}.webp" && rm "$f"
done
```

Si total > 20MB y deploy es Vercel hobby (25MB limit): warning + sugerir CDN external.

## Recursos

- ScrubSequence component: ver skill `scroll-scrub-canvas`
- Animation principles: skill `emilkowalski-skill`
- Premium components: skill `magic-mcp-21st`
- Tailwind v4 docs: https://tailwindcss.com/docs/v4-beta
- shadcn/ui: https://ui.shadcn.com
- Framer Motion (motion.dev): skill `motion`
