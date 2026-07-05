# Archetype: cinematic-product

## 1. Identity
OLED-black stage, bloom, scroll-scrubbed image sequences. Product as hero, lit like a film set. Immersive, dramatic, premium-tech.

## 2. When to use
- Hardware launches (phones, headphones, EVs, wearables, drones).
- Premium SaaS launches where the product surface is visually rich.
- Brief mentions: "immersive", "cinematic", "launch", "reveal", "scroll story", "WebGL", "3D".
- High MI brief signals.

## 3. When NOT to use
- Service brands, agencies, editorial publications.
- Text-heavy brands (consulting, law, accounting).
- Pages with weak product imagery (cinematic with no shots = empty stage).
- Brief signals: "calm", "minimal", "fast read", "informational".

## 4. Baseline dials
- DV: 7
- MI: 8
- VD: 4

## 5. Palette strategy
Drenched dark. Off-black stage + tuned single accent + subtle gradient bloom from product source light.

```css
/* Paleta A — OLED graphite */
--bg:        oklch(0.10 0.005 270);  /* tuned off-black */
--surface:   oklch(0.14 0.008 270);
--ink:       oklch(0.96 0.005 80);
--accent:    oklch(0.72 0.18 200);   /* cool teal bloom */
--muted:     oklch(0.58 0.01 270);

/* Paleta B — warm cinema */
--bg:        oklch(0.12 0.01 30);
--surface:   oklch(0.16 0.012 30);
--ink:       oklch(0.95 0.008 60);
--accent:    oklch(0.74 0.16 60);    /* sodium warm */
--muted:     oklch(0.55 0.015 30);

/* Paleta C — bright OLED */
--bg:        oklch(0.08 0.005 250);
--surface:   oklch(0.12 0.01 250);
--ink:       oklch(0.98 0.003 80);
--accent:    oklch(0.80 0.19 145);   /* signal green */
--muted:     oklch(0.50 0.01 250);
```

## 6. Typography
Display: Geist, Söhne, Inter Display (NOT default Inter — only Inter Display fam allowed for big display), Cabinet Grotesk Medium.
Body: Geist, Plus Jakarta Sans, Satoshi.
Mono: Geist Mono, JetBrains Mono for tabular product specs.
Scale ratio: 1.333. Display H1 clamp(48px, 8vw, 128px).

## 7. Hero direction
Cinematic hero. Pinned canvas, scroll-scrubbed image sequence of the product rotating/exploding/lighting up. Title appears with mask reveal at a specific scroll % through the sequence. Asymmetric: title bottom-left, product centered/right. No static hero image — must be scroll-driven.

## 8. Layout tendencies
12-col grid, full-bleed canvas chapters interleaved with structured spec sections. Density 4 — chapters breathe. Each section uses `min-h-[100dvh]` pinned scrollytelling (MI≥8 requirement).

## 9. Component vocabulary
Good fits:
- Aceternity `apple-cards-carousel` for spec showcase.
- Aceternity `focus-cards` for ecosystem callouts.
- Aceternity `hero-parallax` for product-line overview.
- Three.js + R3F bloom postprocessing for chapter transitions.
- GSAP ScrollTrigger pinned image-sequence canvas.

Weak fits: editorial serifs, dashboards, raw brutalism cards, swiss grids.

## 10. Motion profile
SI: scroll-scrubbed image sequence, pinned chapter reveals, mask text reveals tied to scroll progress, slow camera dolly in 3D scenes, bloom intensifying with scroll.
NO: bouncy springs, magnetic cursor on primary CTAs (breaks cinematic register), gratuitous parallax on every element.
Ease: `power3.inOut`, custom cubic-bezier(0.16,1,0.3,1).

## 11. Copy tone
Confident, technical, short. Numbers matter. No marketing fog.
Good headlines:
- "Six lenses. One sensor. Real data."
- "Built for the studio. Tested in the rain."
- "The lightest body we have ever shipped."

Forbidden headlines:
- "Revolutionizing the way you create"
- "Next-gen experience"
- Fake metrics like "99.99% uptime" without source.

## 12. Forbidden patterns (additional to the 13 global)
- Static hero with full-resolution product PNG and no motion.
- Floating product on white background (this is not Apple's product page from 2014).
- Three feature cards in a row below the hero.
- Inline product image in body copy as decoration.
- Hero-metric template ("99% / 124ms / 18k").
- Light mode primary scenes (chapter contrast can flip briefly).

## 13. Reference brands
- Apple AirPods Max launch page (apple.com/airpods-max).
- Nothing Phone product pages (nothing.tech).
- Polestar configurator landings (polestar.com).
- Linear feature launches (linear.app/now).
