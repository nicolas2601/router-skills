# Archetype: spatial-dark

> v2.1 — emerging direction in SOTD 2025-2026. Dark base + 3D/WebGL gated to one hero element. The rest is ultra-minimal. WebGL only-when-brand-is-experience.

## 1. Identity
Dark stage with a single spatial element holding the hero — a 3D model, a WebGL scene, a particle field — while everything else is ultra-minimal. The 3D is the proof of craft, not the wallpaper. Restrained, premium, and gated by MI=8 (3D is allowed).

## 2. When to use
- Premium product launches where the product surface is intrinsically spatial (cars, headphones, devices, sports equipment).
- Conference landings (e.g., Apple WWDC, Vercel Ship).
- Agency portfolios that lead with 3D craft.
- Brief mentions: "spatial", "3D", "WebGL", "immersive but quiet", "experience-as-brand", "premium 3D", "interactive product".
- Product types: high-end automotive, audio hardware, athletic gear, conference brands, 3D studios.
- Voice signals: "experience", "feel", "presence", "depth".

## 3. When NOT to use
- Text-heavy products (consulting, law, accounting, editorial publications).
- Data dashboards or developer tools.
- Brief mentions: "fast read", "informational", "content-marketing", "blog".
- Pages without a clear hero object/scene worth 3D budget.
- Mobile-first launches where WebGL battery and bundle cost dominate.
- When `cinematic-product` (DV:7 MI:8 VD:4) is a closer fit — that uses image sequences, this uses interactive 3D.

## 4. Baseline dials
- DV: 6
- MI: 8
- VD: 3

DV=6 reasoning: asymmetric composition with the 3D element off-center (often right side), title bottom-left, metadata column floating. Structured-asymmetric, not poster-chaotic.

MI=8 reasoning: 3D is allowed (MI≥7 gate). The hero scene is interactive (orbit, scroll-driven camera dolly, parallax), so motion ambition is high. But the rest of the page is calm — MI doesn't apply uniformly, it concentrates on the hero spatial element.

VD=3 reasoning: ultra-low density everywhere except the hero. Gallery-mode py-32+. The drama is the spatial element; the page should feel like a museum room around it.

## 5. Palette strategy
Drenched dark base + single accent tied to material/light in the 3D scene + cool muted secondary. Background must be deep enough to make WebGL bloom and rim-lighting read.

```css
/* Paleta A — deep graphite */
--bg:           oklch(0.09 0.005 270);   /* near-black */
--surface:      oklch(0.13 0.008 270);
--ink:          oklch(0.96 0.005 80);
--muted:        oklch(0.55 0.012 270);
--accent:       oklch(0.72 0.18 200);    /* cool teal bloom */
--line:         oklch(0.22 0.01 270);

/* Paleta B — warm cinema */
--bg:           oklch(0.11 0.01 30);
--surface:      oklch(0.15 0.012 30);
--ink:          oklch(0.95 0.008 60);
--muted:        oklch(0.55 0.014 30);
--accent:       oklch(0.74 0.16 60);     /* sodium warm */
--line:         oklch(0.25 0.012 30);

/* Paleta C — signal void */
--bg:           oklch(0.07 0.005 250);   /* deeper than OLED */
--surface:      oklch(0.11 0.008 250);
--ink:          oklch(0.98 0.003 80);
--muted:        oklch(0.50 0.01 250);
--accent:       oklch(0.80 0.22 145);    /* signal green */
--line:         oklch(0.20 0.008 250);

/* Paleta D — bronze dark */
--bg:           oklch(0.10 0.008 50);
--surface:      oklch(0.14 0.012 50);
--ink:          oklch(0.95 0.008 80);
--muted:        oklch(0.55 0.015 50);
--accent:       oklch(0.68 0.15 70);     /* bronze rim */
--line:         oklch(0.24 0.014 50);
```

## 6. Typography
Display: Geist Variable (vendored), Söhne, Cabinet Grotesk Medium. Clean sans-serif to not compete with the 3D element.
Body: Plus Jakarta Sans, Satoshi, Söhne Buch.
Mono: GT America Mono, JetBrains Mono — for spatial metadata captions (coordinates, dimensions, frame counts).
Scale ratio: 1.333. H1 clamp(48px, 7vw, 112px). Body 16-18px. Type stays calm; the 3D is the spectacle.

If Geist is required: `next/font/local` with vendored Geist files or `@vercel/geist-font`. NOT `next/font/google` (broken).

## 7. Hero direction
3D element occupies right 60% of viewport, title bottom-left in 6-col span, small metadata column (coordinates, scene name, frame tick) top-right in mono. Background is the palette dark surface — no gradient backgrounds compete with 3D bloom. On scroll, camera dollies slowly (3-6s scroll range), product rotates 15-25deg, postprocessing bloom intensifies subtly. Reduced-motion fallback: static rendered frame as `<img>` placeholder + Suspense skeleton (Law 4 — no `dynamic({ssr:false})` for hero).

## 8. Layout tendencies
12-col grid, full-bleed hero canvas. Subsequent scenes drop to ultra-minimal text+caption rhythm. Density 3 — generous py-40 between scenes, one anchor per section. The 3D scene is the only "loud" moment; everything after is gallery-mode. Mobile fallback: 3D collapses to autoplay muted micro-video loop or static rendered still.

## 9. Component vocabulary
Good fits:
- R3F `Canvas` + drei `Environment` + drei `PerspectiveCamera` + drei `ScrollControls` for hero scene.
- R3F postprocessing `Bloom` for rim-light glow.
- R3F drei `MeshTransmissionMaterial` for glass/transparent product surfaces.
- R3F drei `Float` for ambient drift on idle.
- GSAP ScrollTrigger pinned camera dolly tied to scroll.
- Aceternity `spotlight` for non-hero scene moments (very sparingly).
- Custom: rendered-still fallback, metadata coordinate caption, scene-name top-right rail.

Weak fits: bento grids (clashes with spatial register), focus-cards, `apple-cards-carousel` (use `cinematic-product` instead), magnetic CTAs, gradient backgrounds, glassmorphism surfaces, marquees.

## 10. Motion profile
SI: scroll-coupled camera dolly (3-6s scroll range), product rotation on scroll (15-25deg), bloom intensity tied to scroll progress, rim-light hue shift on hover (subtle, 8-12% lightness range), idle Float drift (max 1deg, 4s loop), text mask reveals for title on scroll-in.
NO: cursor-tracking 3D parallax that follows the mouse aggressively, bouncy spring physics on the 3D object, magnetic cursor effects, multiple 3D scenes per page (max 1 hero scene), particle storms.
Ease: `power3.inOut`, `cubic-bezier(0.16, 1, 0.3, 1)`. Durations 1200-2400ms (slow, monumental).
Performance gates: 3D scene must hit ≥45fps on M1/equivalent. Use `dpr={[1, 1.5]}` cap, `frameloop="demand"` for static frames, low-poly LOD (<50k tris), GLB compressed with Draco/meshopt.
prefers-reduced-motion: 3D scene replaced by static rendered still + Suspense fallback.

## 11. Copy tone
Confident, technical, sparse. Specs and weights matter. No marketing fog.
Good headlines:
- "Six grams. Nine layers. One sound."
- "Built where physics meets craft."
- "The body is the brief."

Forbidden headlines:
- "Experience the future of audio"
- "Revolutionizing immersive design"
- AI clichés (next-gen, unleash, elevate).
- Fake metrics ("99.99% accuracy", "124ms latency") without source.

## 12. Forbidden patterns (additional to the 13 global)
- Multiple 3D scenes on the same page (max 1 hero, exceptions need justification in DESIGN.md).
- 3D used as background wallpaper instead of hero element.
- Particle-storm hero scenes (clashes with restraint).
- Bento grids of 3D thumbnails (defeats the gating principle).
- Light-mode hero (this archetype is dark-base only).
- Magnetic cursor effects on 3D scene (breaks premium register).
- `dynamic({ssr:false})` for hero 3D canvas (Law 4 — use Suspense + skeleton instead).
- Hero-metric template ("99% / 124ms / 18k").
- Gradient backgrounds behind the 3D scene.
- 3D scene without reduced-motion fallback.
- Animating product width/height/scale on idle (Law 6 — transform/opacity only).

## 13. Reference brands
- Lando Norris Official (landonorris.com) — SOTY 2025, dark spatial helmet hero with scroll-driven camera dolly.
- Bruno Simon Portfolio (bruno-simon.com) — SOTM 2026, dark spatial portfolio.
- Messenger Meta (messenger.com) — SOTY 2025, dark spatial product hero.
- Linear product card 3D demos (linear.app/now) — sparingly placed 3D in dark surface.
- Polestar configurator landings (polestar.com) — dark-spatial automotive hero.
- Bang & Olufsen Beosound A5 launch (bang-olufsen.com) — single 3D speaker hero scene.
