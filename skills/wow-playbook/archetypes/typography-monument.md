# Archetype: typography-monument

> v2.1 — emerging direction in SOTD 2025-2026. Type is the building. No hero imagery. Variable fonts respond to scroll with micro-movement, not kinetic typography (which degrades CWV).

## 1. Identity
A single typographic element dominates the entire hero. The page is built around one word, one sentence, one set in a monumental scale. Variable font axes shift subtly with scroll. No imagery competes. Structural typography with micro-movement, not kinetic chaos.

## 2. When to use
- Type-foundry portfolios, typographer studios, design publications.
- Agency portfolios that want to lead with voice instead of work-thumbnail.
- Brief mentions: "typographic", "type-first", "letterforms", "no images", "manifesto", "type foundry", "expressive type".
- Product types: type foundries, design studios, lettering artists, brand consultancies, conference landings.
- Voice signals: declarative, name-as-statement, single-anchor brand.

## 3. When NOT to use
- Visually rich products (hardware, photography, fashion shoots) — type-only wastes the asset.
- Data dashboards.
- E-commerce, configurators.
- Brief mentions "show our work", "portfolio gallery", "product showcase".
- Mobile-first apps (huge type rarely survives portrait phone breakpoint).

## 4. Baseline dials
- DV: 7
- MI: 5
- VD: 2

DV=7 reasoning: composition is asymmetric and scene-led — type aligned to grid edges, sized to viewport, off-baseline by intent. Not poster-level chaos (that's DV=9 anti-grid), but firmly past structured.

MI=5 reasoning: variable font axis shifts on scroll, subtle weight breathing, scroll-coupled letter-spacing — these are micro-movements, not kinetic typography. MI=5 unlocks scroll reveals and micro-interactions while keeping the page calm. NOT MI=8+ (which would mean kinetic chaos and CWV penalty).

VD=2 reasoning: low density by definition. The whole point is monumental scale = one anchor per viewport. Gallery-mode py-32+ between scenes.

## 5. Palette strategy
Restrained, near-monochrome. Two inks (background + type), optional third for caption metadata. The type IS the visual — color must not compete. Light or dark mode both work; pick one and commit.

```css
/* Paleta A — paper monument */
--bg:        oklch(0.97 0.005 90);    /* warm paper */
--ink:       oklch(0.16 0.012 60);    /* warm charcoal */
--meta:      oklch(0.55 0.015 60);    /* metadata gray */
--accent:    oklch(0.55 0.14 35);     /* terracotta — captions only */

/* Paleta B — dark monument */
--bg:        oklch(0.12 0.008 250);   /* deep ink-blue */
--ink:       oklch(0.96 0.005 80);    /* paper white */
--meta:      oklch(0.62 0.012 250);
--accent:    oklch(0.78 0.18 75);     /* signal amber */

/* Paleta C — bone + ink */
--bg:        oklch(0.94 0.012 85);    /* bone */
--ink:       oklch(0.20 0.022 260);   /* publication navy */
--meta:      oklch(0.50 0.020 260);
--accent:    oklch(0.42 0.10 260);

/* Paleta D — soft cream */
--bg:        oklch(0.96 0.018 95);    /* warm cream */
--ink:       oklch(0.18 0.015 50);
--meta:      oklch(0.50 0.018 60);
--accent:    oklch(0.50 0.08 115);    /* muted olive */
```

## 6. Typography
Display whitelist (variable fonts only — required for axis-driven motion): Fraunces (opsz, wght, SOFT axes), PP Editorial New (variable), Cabinet Grotesk Variable, Migra (italic axis), Gambarino, Clash Display Variable, Söhne Variable.
Body: Söhne, Plus Jakarta Sans, Satoshi — strictly secondary, set small.
Mono: GT America Mono, JetBrains Mono — captions and metadata only.
Scale ratio: 2.0 (extreme — display is 10-20x body size). H1 clamp(96px, 22vw, 480px). Body 16-18px. The jump is the design.

If Geist is required: vendored via `next/font/local` or `@vercel/geist-font`. NEVER `next/font/google` (broken). Geist Variable would be the supported variant.

## 7. Hero direction
Type IS the hero. One word or one sentence sized to fill 60-90% of viewport width. No imagery. Composition: title aligned to a grid edge (left or right, never centered if DV=7), small metadata column 1 (label + date + author) in mono 12-14px stuck to opposite edge. Variable font axes (wght, opsz, SOFT) respond to scroll position with `font-variation-settings` via CSS custom properties tied to scroll-progress. Subtle, 6-12% axis range, not destabilizing.

## 8. Layout tendencies
8-col grid (wider than typical 12 for monumental composition). Gutters huge (3rem+). Density 2 — one anchor per scene, py-40+ between sections. Subsequent scenes (after hero) can carry an image plate or paired text, but type remains the dominant rhythm. Whitespace pattern: gallery — each scene is a room with one piece in it.

## 9. Component vocabulary
Good fits:
- React Bits `split-text` with custom variable-axis tween (instead of opacity/translate).
- GSAP `text-masking` for chapter intros on subsequent scenes.
- GSAP custom: scroll-coupled `font-variation-settings` driver.
- Aceternity `text-generate-effect` for slow caption reveals (max 1 per page).
- Aceternity `hero-parallax` for the single image-plate scene if any.
- Custom: variable-axis scroll driver, metadata caption rail, single-letter monument tile.

Weak fits: bento grids, cards of any kind, magnetic CTAs, parallax-heavy galleries, scroll-scrubbed image sequences, focus-cards, glassmorphism, gradients.

## 10. Motion profile
SI: scroll-coupled variable font axis shifts (wght 400→700 over hero scroll, or opsz scaling), letter-spacing breathing (max 2% range), subtle Y-translate of the monumental type as it scrolls out (6-12vh max), slow underline drifts on links, single mask-reveal on entry (800-1200ms).
NO: kinetic typography (letters flying around, characters animating independently — this is the explicit anti-thesis), per-character chaos, WebGL text, 3D type, magnetic letters, scroll-scrubbed letterform morphs (CWV killer), parallax across multiple letters.
Ease: `cubic-bezier(0.32, 0.72, 0, 1)` (Apple), durations 800-1400ms (slow, monumental).
CWV note: avoid animating any axis that triggers reflow (size-related axes carefully clamped, prefer wght/SOFT/opsz over wdth).

## 11. Copy tone
The headline IS the brand. One declarative statement, no slogan. Title set as the only line that matters on the page.
Good headlines:
- "Type is structure."
- "We draw letters. We ship typefaces."
- "Reading is the interface."
- "A foundry, not a font shop."

Forbidden headlines:
- "Crafted typography for the modern web"
- "Elevating type design"
- Anything with em-dash decoration.
- Multi-line marketing copy as hero (defeats monument).

## 12. Forbidden patterns (additional to the 13 global)
- Imagery in the hero (type only — that is the archetype).
- Kinetic typography that animates individual characters chaotically.
- Hero with title + subtitle + button + supporting image (this is editorial, not monument).
- Centered hero (DV=7 forbids it).
- Sub-headline below the monument (let it stand alone).
- Bento grids anywhere on the page.
- 3-up feature card row.
- Variable-axis animation that triggers reflow (`wdth` outside 95-105% range, font-size in animation loops).
- Hover scale on the monumental type.
- Drop shadows on type.

## 13. Reference brands
- Pentagram new identity pages (pentagram.com) — Paula Scher type-monument tradition.
- Studio Dumbar (studiodumbar.com) — monumental variable-type case studies.
- Bureau Mirko Borsche (mirkoborsche.com) — type as the entire composition.
- OFF+BRAND (offplusbrand.com) — agency portfolios with variable-axis hero.
- Klim Type Foundry (klim.co.nz) — type-foundry monument tradition.
- Grilli Type (grillitype.com) — type-only hero scenes with axis motion.
