# Archetype: premium-bento

## 1. Identity
Modular polished cards telling product stories. Each tile is a behavior, not a feature copy block. Modern SaaS / AI product launch flavor — Apple-event-on-the-web.

## 2. When to use
- Modern SaaS launches, AI products, dev tools, productivity apps with rich feature surfaces.
- Brief mentions: "bento", "modular", "feature grid", "product launch", "SaaS premium", "AI product".
- Brands that need to show 6-12 capabilities without becoming a feature wall.

## 3. When NOT to use
- Editorial, gallery, portfolio.
- Pure dashboards (use dashboards).
- Brief mentions "calm", "quiet", "single product", "minimal".

## 4. Baseline dials
- DV: 6
- MI: 6
- VD: 6

## 5. Palette strategy
Committed. Tinted neutrals + one main accent + one secondary accent. Mesh gradient allowed as ambient surface only.

```css
/* Paleta A — dark slate + lime */
--bg:        oklch(0.14 0.012 250);
--surface:   oklch(0.18 0.014 250);
--surface-2: oklch(0.22 0.014 250);
--ink:       oklch(0.96 0.005 80);
--muted:     oklch(0.62 0.012 250);
--accent:    oklch(0.78 0.20 130);    /* lime */
--accent-2:  oklch(0.65 0.18 240);    /* teal */

/* Paleta B — paper + violet (NOT AI-purple) */
--bg:        oklch(0.97 0.008 90);
--surface:   oklch(0.95 0.010 90);
--surface-2: oklch(0.92 0.012 90);
--ink:       oklch(0.18 0.012 50);
--muted:     oklch(0.52 0.014 60);
--accent:    oklch(0.50 0.16 290);    /* deep violet (saturated, not pastel-AI) */
--accent-2:  oklch(0.70 0.14 40);

/* Paleta C — graphite + amber */
--bg:        oklch(0.13 0.010 50);
--surface:   oklch(0.17 0.012 50);
--surface-2: oklch(0.21 0.012 50);
--ink:       oklch(0.95 0.005 80);
--muted:     oklch(0.60 0.012 50);
--accent:    oklch(0.74 0.16 70);     /* amber */
--accent-2:  oklch(0.62 0.16 200);
```

## 6. Typography
Display: Geist, Söhne, Inter Display, PP Neue Montreal.
Body: Geist, Plus Jakarta Sans.
Mono: Geist Mono for code, tabular data inside cards.
Scale ratio: 1.333. H1 clamp(48px, 7vw, 96px).

## 7. Hero direction
Two scenes: hero with strong tagline + one ambient 3D/canvas behind, immediately followed by the bento grid (4-6 tiles of varied size). Asymmetric grid: 12-col split into tiles of (col-span-4 row-span-2), (col-span-8 row-span-1), etc.

## 8. Layout tendencies
12-col bento with irregular tile sizes. Density 6 — tiles are rich but pacing breathes. py-24. Each tile is a self-contained behavior demo: live input, animated chart, code editor preview, etc.

## 9. Component vocabulary
Good fits:
- Aceternity `bento-grid`, `3d-pin`, `focus-cards`, `card-hover-effect`.
- Magic UI `animated-list`, `marquee` (logo strip), `bento-grid`.
- React Bits `tilted-card`, `magnet-lines`.
- 21st.dev command-bar inside one tile.
- R3F + drei `Float`, `MeshTransmissionMaterial` for one tile.

Weak fits: editorial serifs, dark-luxe slow spotlights, brutalism poster cuts.

## 10. Motion profile
SI: hover tilt on tiles (max 4deg), layout transitions on tile hover (expand-to-show), staggered fade-in on grid mount, micro-loops inside tiles (animated chart line, cursor blink), 3D pin lift on hover.
NO: full-page scroll spectacle, magnetic on every element, marquees of text everywhere.
Ease: cubic-bezier(0.32, 0.72, 0, 1). Durations 300-600ms.

## 11. Copy tone
Concrete features, no fluff. Each tile = one capability with one verb.
Good headlines (per tile):
- "Inline AI rewrite. 12 languages."
- "Trace any query in 3 clicks."
- "Push to prod from your editor."

Forbidden headlines:
- "Empowering modern teams"
- "Next-gen workflow platform"
- Fake metrics like "10x faster".

## 12. Forbidden patterns (additional to the 13 global)
- Three equal tiles in a row (must be varied sizes).
- Pure-flat tiles with no inner content behavior.
- Generic placeholder screenshots that nobody can read.
- AI-purple-blue mesh gradient (use one tuned accent).
- Every tile rounded-3xl with same shadow (vary radius and elevation).
- Decorative emojis inside tiles.

## 13. Reference brands
- Linear feature pages (linear.app/features).
- Vercel dashboard product page.
- Raycast (raycast.com).
- Cron / Notion Calendar landing.
