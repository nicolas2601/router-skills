# WOW v2 — Style Recipes (Archetype × Component Mapping)

> Source-of-truth mapping used by `wow-design-synthesizer` and `wow-scaffold-builder`.
> Cites EXACT library + EXACT component name. When no library has a clean fit for a cell, the cell reads `custom (DV:X spec)` with a short inline spec.

Library shorthand:
- **A** = Aceternity UI (https://ui.aceternity.com)
- **M** = Magic UI (https://magicui.design)
- **RB** = React Bits (https://reactbits.dev)
- **21** = 21st.dev (https://21st.dev)
- **GSAP** = GSAP official demos (https://gsap.com/demos)
- **R3F** = react-three-fiber + drei
- **custom** = no library has a clean fit; build per spec

---

## 1. MASTER MATRIX

Each cell = primary recipe. Variants section below.

| Archetype | Hero | Intro / About | Features / Cards | Proof / Logos | Media / Showcase | CTA / Closer |
|---|---|---|---|---|---|---|
| **brutalism** | GSAP `directional-marquee` + poster slab title | custom (DV:6 raw block — left-aligned big serif italic + tight ruled metadata) | RB `card-stack` hard-edge variant | GSAP marquee logos at constant linear speed | GSAP image-sequence scrubbed full-bleed | custom (DV:6 — slab with two-word imperative + arrow link, no button chrome) |
| **cinematic-product** | R3F image-sequence canvas + R3F bloom postprocess + GSAP ScrollTrigger pin | A `apple-cards-carousel` for narrative beats | A `focus-cards` (varying focus per scroll) | M `marquee` logos slow + low-contrast | A `hero-parallax` rotation showcase | A `moving-border` button + spec sheet table |
| **dark-luxe** | A `spotlight` + A `background-gradient-animation` (very slow) | A `text-generate-effect` on serif paragraph | 21 `hover-card` hairline-bordered | M `marquee` slow with logo desaturation | A `parallax-scroll` image gallery | A `moving-border` button + reservation form |
| **dashboards** | custom (DV:4 — static console preview + tight tagline + live status badge) | custom (DV:4 — three numbered tabs with live data tick) | 21 `data-table` + 21 `command-palette` | custom (DV:4 — hairline ledger of named integrations) | M `animated-list` live event feed | custom (DV:4 — pricing matrix table with tabular numerals) |
| **editorial-premium** | A `hero-parallax` (single slow row) + serif title overlay | custom (DV:5 — split article lead 5/7 with dek) | custom (DV:5 — editorial bento with 4/8 + 6/6 alternation) | custom (DV:5 — hairline logo wall, 4-col, year-stamped) | A `hero-parallax` interruption row | custom (DV:5 — twin previous/next stories, no button CTA) |
| **gallery-minimal** | custom (DV:4 — single full-bleed image plate + caption-rail title below) | custom (DV:4 — small metadata block right-aligned) | custom (DV:4 — irregular masonry, no card chrome) | custom (DV:4 — small year list, no logos) | A `parallax-scroll` slow gallery | custom (DV:4 — appointment-only contact line) |
| **minimalism** | custom (DV:3 — headline + paragraph + one button, off-center slight asymmetry) | RB `split-text` on small intro paragraph | custom (DV:3 — vertical list with hairline rules, no cards) | custom (DV:3 — single-line "Used by:" + 3 names) | custom (DV:3 — one small framed object photograph) | custom (DV:3 — bordered button + footer single line) |
| **monochrome-modern** | GSAP `directional-marquee` (slow, mono) + tight asymmetric headline + metadata rail | RB `text-cursor` + RB `split-text` | custom (DV:5 — project ledger with year stamps + hover swap thumbnail) | M `marquee` mono logos | A `text-reveal-card` per project hover | custom (DV:5 — index footer with section numbers) |
| **premium-bento** | M `bento-grid` with one large hero tile + tagline + A `3d-pin` accent | A `card-hover-effect` 3-up | A `bento-grid` + A `focus-cards` mixed | M `marquee` logos + 21 chips | A `3d-pin` showcase + R3F `Float` tile | M `bento-grid` final CTA tile + 21 command-bar |
| **quiet-luxury** | A `hero-parallax` (very slow single image) + small serif title bottom-left | custom (DV:4 — paired image + paragraph block, generous margins) | custom (DV:4 — three offerings as paragraph blocks, not cards) | custom (DV:4 — no logos; trade press quotes paragraph) | A `parallax-scroll` slow | custom (DV:4 — reservation block with single field) |
| **soft** | RB `bounce-cards` with one large soft tile + warm illustration + headline | RB `pixel-card` (soft variant) | RB `bounce-cards` 3-up with springs | M `marquee` warm logos | RB `magnet-lines` (subtle) + photographs | M `confetti` on submit + soft rounded CTA |
| **soft-brutalism** | custom (DV:6 — color band + giant serif italic + framed photograph overlapping) | RB `flowing-menu` + RB `split-text` | RB `tilted-card` + RB `bounce-cards` warm | GSAP `directional-marquee` colored bg medium speed | A `text-reveal-card` warm | RB `splash-cursor` + bold hard-fill CTA |
| **swiss-system** | custom (DV:4 — strict grid hero, section `01 /`, big grotesk, right-aligned meta) | custom (DV:4 — numbered list with hairline rules) | custom (DV:4 — ruled ledger of capabilities, no cards) | custom (DV:4 — 4-col logo grid hairline) | 21 `tabs` for project archive | custom (DV:4 — contact ledger, no button — hyperlink in body) |
| **warm-modern** | A `hero-parallax` (one row) + warm photograph + asymmetric headline | RB `scroll-reveal` on team rail | A `card-hover-effect` warm + 21 `tabs` | M `marquee` warm-toned logos | A `parallax-scroll` warm gallery | A `moving-border` warm CTA + paired contact card |
| **anti-grid-brutalism** | custom (DV:9 — rotated slab title + off-canvas rule + mono metadata two cols away) | custom (DV:9 — raw form field + view-source caption strip, no card) | RB `card-stack` hard-edge + raw markdown list (no cards) | GSAP `directional-marquee` constant linear speed (mechanical) | GSAP image-sequence full-bleed hard-cut + RB `image-trail` hard-cut variant | custom (DV:9 — manifesto closing slab + raw `<a>` link, browser-default underline, no button chrome) |
| **bento-motion** | M `bento-grid` 4×2 anchor tile + cross-cell stagger 60ms + M `animated-shiny-text` headline | M `bento-grid` 2×1 tiles with M `animated-list` event feed inside | M `bento-grid` + A `card-hover-effect` per tile + A `3d-pin` on 1 anchor tile | M `marquee` slow inside 6×1 ribbon tile | A `bento-grid` + R3F `Float` 3D tile (gated MI=7) + looping micro-videos per tile | M `bento-grid` final CTA tile + 21 `command-bar` + coordinated cross-cell dim on submit |
| **typography-monument** | custom (DV:7 — single monumental word/sentence clamp(96px,22vw,480px) + variable-axis scroll driver + mono metadata column) | RB `split-text` variable-axis tween (wght/opsz, no opacity/translate) | custom (DV:7 — paired text-only blocks, no cards, monumental sub-headlines per scene) | custom (DV:7 — single-line collaborators list, mono 14px, no logos) | A `hero-parallax` single slow image plate (max 1 per page) | custom (DV:7 — closing monument statement + small mono signature, no button) |
| **spatial-dark** | R3F `Canvas` + drei `Environment` + drei `ScrollControls` + R3F `Bloom` postprocess + GSAP camera dolly | custom (DV:6 — sparse text block bottom-left + mono coord caption top-right) | custom (DV:6 — three text+spec rows, no cards, py-40 between) | custom (DV:6 — single-line collaborators/press mention, mono, no logos) | rendered-still gallery custom (DV:6 — frame stills from the 3D scene, not new media) | A `moving-border` CTA dark + mono spec table closing |

---

## 2. VARIANT TABLE (seed RNG selects)

For cells with multiple acceptable variants, the seed picks one. Each variant is keyed `0`, `1`, `2`. `seed_byte mod variant_count` selects.

### 2.1 Hero variants

| Archetype | v0 | v1 | v2 |
|---|---|---|---|
| brutalism | poster slab + ruled metadata | full-bleed photographic crop + bottom-left title | marquee-only hero (no static image) |
| cinematic-product | R3F image-sequence + bloom | R3F orbit camera around hero object + mask reveal | R3F environment + GLSL fresnel rim + scroll dolly |
| dark-luxe | spotlight + gradient bg | full image + dark vignette + bottom-third title | slow video loop (silenced) + serif italic |
| dashboards | static console preview | live data widget (animated number ticks) | command-bar simulation |
| editorial-premium | serif display + image plate (image above) | rotating word display + meta column | asymmetric crop 5/7 with display offset |
| gallery-minimal | single full-bleed plate | framed plate with 8vw margin | diptych (two images side by side, no title) |
| minimalism | headline + paragraph + button | headline + paragraph only (no button — link in nav) | headline + small object photograph |
| monochrome-modern | marquee + tight metadata | tight title left + project image right | full-bleed type only, no image |
| premium-bento | bento + tagline + 3d-pin | bento + R3F Float tile | bento + animated chart tile |
| quiet-luxury | hero-parallax + small title | full-bleed photograph + serif italic | diptych material details |
| soft | bounce-cards + illustration | illustration + headline centered | warm photograph + headline overlay |
| soft-brutalism | color band + framed photo overlap | colored full-bleed + display italic | two-tone split with diagonal rule |
| swiss-system | strict grid + 01/ section + meta | type-only hero (no image) | grid + one geometric mark |
| warm-modern | hero-parallax + warm photograph | asymmetric title + paired image block | full-bleed photograph + bottom-left title |

### 2.2 Features / Cards variants

| Archetype | v0 | v1 | v2 |
|---|---|---|---|
| brutalism | RB `card-stack` hard-edge | raw vertical list (no cards) | numbered slab band |
| cinematic-product | A `focus-cards` | A `apple-cards-carousel` | A `bento-grid` dark |
| dark-luxe | 21 `hover-card` hairline | A `card-hover-effect` dark | A `direction-aware-hover` |
| dashboards | 21 `data-table` | 21 `command-palette` | tabular ledger custom |
| editorial-premium | editorial bento 4/8 + 6/6 | numbered chapter list | paired image-text twins |
| premium-bento | A `bento-grid` | A `focus-cards` | A `card-hover-effect` |
| soft-brutalism | RB `tilted-card` | RB `bounce-cards` warm | 21 chips + paragraph |
| warm-modern | A `card-hover-effect` warm | 21 `tabs` | paired image+paragraph blocks |

### 2.3 Media / Showcase variants

| Archetype | v0 | v1 | v2 |
|---|---|---|---|
| brutalism | GSAP image-sequence | GSAP `directional-marquee` of images | RB `image-trail` (hard-cut) |
| cinematic-product | A `hero-parallax` | R3F orbit showcase | A `apple-cards-carousel` |
| dark-luxe | A `parallax-scroll` | A `images-slider` | custom dark gallery |
| editorial-premium | A `hero-parallax` | image-plate full-bleed interruption | image diptych pair |
| gallery-minimal | A `parallax-scroll` | irregular masonry custom | one large plate per scene |
| premium-bento | A `3d-pin` showcase | R3F `Float` tile | A `apple-cards-carousel` |

### 2.4 CTA / Closer variants

| Archetype | v0 | v1 | v2 |
|---|---|---|---|
| brutalism | two-word imperative + arrow | full-band imperative no button | timeline ledger as closing |
| cinematic-product | A `moving-border` + spec table | spec table only | configurator preview block |
| dark-luxe | A `moving-border` + reservation | quiet email-only contact | letter-style closing |
| dashboards | pricing matrix table | docs link + signup card | API key request form |
| editorial-premium | previous/next twins | letter-style sign-off | issue-archive ledger |
| premium-bento | bento CTA tile + command bar | bento CTA tile + pricing matrix | bento CTA tile + waitlist form |
| soft | M `confetti` + soft CTA | testimonial + CTA paired | newsletter card with illustration |
| warm-modern | A `moving-border` + contact card | calendar booking embed | letter-style contact note |

---

## 3. VARIANT SELECTION RNG

### Seed contract

```ts
seed = sha256(`${projectPath}::${YYYYMMDD-HHMMSS}::${counter}`).slice(0, 16)
// seed is a 16-hex-char string = 8 bytes.
```

### Byte mapping → variant selection

Each cell consumes one seed byte. Order of consumption (left to right):

1. Hero variant — byte 0
2. Intro variant — byte 1
3. Features variant — byte 2
4. Proof variant — byte 3
5. Media variant — byte 4
6. CTA variant — byte 5
7. Reserved (motion sub-variant) — byte 6
8. Reserved (palette index 0|1|2) — byte 7

Per cell:

```ts
function selectVariant(seedHex: string, byteIndex: number, variantCount: number): number {
  const byte = parseInt(seedHex.slice(byteIndex * 2, byteIndex * 2 + 2), 16)
  return byte % variantCount
}
```

Example for `editorial-premium` with seed `a1f2b3c4d5e6f708`:
- byte 0 = `0xa1` (161) → hero variant 161 % 3 = 2 → "asymmetric crop 5/7"
- byte 2 = `0xb3` (179) → features variant 179 % 3 = 2 → "paired image-text twins"
- byte 7 = `0x08` (8) → palette index 8 % 3 = 2 → "Paleta C — cream + olive"

### Fallback rules

- If `variantCount = 1` (cell has no alternatives), skip — do not consume the byte.
- If `seed` is missing (legacy iteration), default to variant 0 across all cells.
- If two consecutive runs would land on the same hero variant for the same archetype, the orchestrator increments the byte by 1 (wrap-around) to force a different variant — this is the recipe-level anti-loop tier.

---

## 4. COMPONENT EXACT NAMES (canonical references)

When sub-agents code these, they should match these exact names so the auditor can grep for them:

- Aceternity (canonical slugs, verified at ui.aceternity.com 2025-2026): `hero-parallax`, `apple-cards-carousel`, `focus-cards`, `bento-grid`, `card-hover-effect`, `direction-aware-hover`, `hover-card`, `parallax-scroll`, `text-generate-effect`, `text-reveal-card`, `spotlight`, `background-gradient-animation`, `moving-border`, `lamp`, `background-beams`, `sparkles`, `meteors`, `images-slider`, `3d-pin`, `3d-card-effect`, `glare-card`, `wavy-background`. (Note: `lamp-effect` and `glowing-stars-background` from earlier drafts are NOT canonical — use `lamp` and `background-beams`/`sparkles`.)
- Magic UI: `bento-grid`, `marquee`, `animated-list`, `confetti`, `animated-shiny-text`.
- React Bits: `split-text`, `text-cursor`, `scroll-reveal`, `bounce-cards`, `tilted-card`, `pixel-card`, `card-stack`, `flowing-menu`, `magnet-lines`, `splash-cursor`, `image-trail`.
- 21st.dev: `data-table`, `command-palette`, `tabs`, `hover-card`, `command-bar`.
- GSAP demos: `directional-marquee`, `text-masking`, `animate-text`, `image-sequence`.
- R3F + drei: `Float`, `MeshTransmissionMaterial`, `Environment`, `PerspectiveCamera`, `ScrollControls`, `Bloom` (postprocessing).

---

## 5. CELL OVERRIDE PROTOCOL

Sub-agents may override a cell only when:

- The archetype's "Weak fits" list explicitly flags the recipe component as wrong (then pick variant 1).
- The brief specifies content type incompatible with the variant (e.g., editorial brief with no images → fall back to `text-only` hero variant 1).
- Variety penalty has been triggered (see `recipes/variety-modes.md` §4).

In all override cases, the sub-agent must log the override reason in the build's `DESIGN_vN.md` under "Recipe overrides".
