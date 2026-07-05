# Archetype: bento-motion

> v2.1 — distinct from `premium-bento` (DV:6 MI:6). This is bento with coordinated motion choreography between cells. Research shows +23% scroll depth vs traditional grid layouts when motion is coordinated, not per-cell isolated.

## 1. Identity
Bento grid where the cells move as a coordinated system, not as 9 independent animated tiles. Cells respond to each other on scroll/hover — when one expands the others retreat, when one plays a media loop the others dim. The grid is a stage, not a wallpaper.

## 2. When to use
- AI products with multiple capabilities to demonstrate.
- Feature pages for B2B SaaS launching a multi-surface release.
- Brief mentions: "show many features", "AI features", "capability overview", "coordinated", "feature grid", "tile motion", "multi-modal".
- Product types: AI assistants, design tools, dev platforms, productivity suites.
- Voice signals: "we do many things well", "platform", "suite".

## 3. When NOT to use
- Single-product hardware launches (use `cinematic-product`).
- Editorial publications (use `editorial-premium`).
- Brief mentions: "minimal", "calm", "quiet", "longform".
- Pages where each cell would compete with a primary product image.
- Mobile-first products where bento collapses to vertical stack and the coordination is lost.

## 4. Baseline dials
- DV: 6
- MI: 7
- VD: 6

DV=6 reasoning: bento itself is structured-asymmetric (the grid breaks into 4/8 and 6/6 and 12/0 splits across the same section), but the cells maintain rectilinear discipline. Not poster-level.

MI=7 reasoning: coordinated motion across cells requires layout transitions, scroll-coupled state machines, intersection-driven dim/lift behaviors. MI=7 unlocks scroll reveals + micro-interactions + stagger. Below 7 the coordination collapses to isolated cell animations.

VD=6 reasoning: dense enough to need the grid, generous enough that each cell breathes. Not cockpit.

## 5. Palette strategy
Committed dual-mode. Dark surface base + tinted card backgrounds with hairline borders + 1-2 accent inks that flag interaction state. Each cell carries a subtle palette shift to suggest "different surface, same system".

```css
/* Paleta A — graphite + signal */
--bg:           oklch(0.13 0.008 270);   /* off-black system bg */
--surface-1:    oklch(0.17 0.012 270);   /* tile resting */
--surface-2:    oklch(0.21 0.015 270);   /* tile hovered */
--ink:          oklch(0.96 0.005 80);
--muted:        oklch(0.58 0.012 270);
--accent:       oklch(0.72 0.18 200);    /* cool signal */
--line:         oklch(0.30 0.01 270);

/* Paleta B — warm AI */
--bg:           oklch(0.15 0.01 30);
--surface-1:    oklch(0.19 0.014 30);
--surface-2:    oklch(0.24 0.018 30);
--ink:          oklch(0.95 0.008 60);
--muted:        oklch(0.60 0.015 30);
--accent:       oklch(0.78 0.16 60);     /* warm signal */
--line:         oklch(0.32 0.014 30);

/* Paleta C — light bento */
--bg:           oklch(0.97 0.005 95);
--surface-1:    oklch(0.94 0.008 90);
--surface-2:    oklch(0.90 0.012 90);
--ink:          oklch(0.18 0.012 50);
--muted:        oklch(0.48 0.015 60);
--accent:       oklch(0.55 0.18 280);    /* violet signal */
--line:         oklch(0.85 0.008 90);
```

## 6. Typography
Display: Cabinet Grotesk Medium, Söhne, Plus Jakarta Sans Bold. Avoid serifs (breaks system register).
Body: Plus Jakarta Sans, Satoshi, Söhne Buch.
Mono: JetBrains Mono, GT America Mono for code/spec tiles, tabular numerals on metric tiles.
Scale ratio: 1.25 (calm, system-y). H1 clamp(40px, 6vw, 88px). Tile labels 14-16px.

If Geist is required: `next/font/local` with vendored files or `@vercel/geist-font` — NOT `next/font/google`.

## 7. Hero direction
Hero IS the bento. Largest tile (4-col, 2-row) carries headline + 1-line dek. Surrounding 5-7 tiles preview the capabilities with thumbnail media (looping micro-videos, animated SVG charts, code snippets, captured screen states). On scroll-in the tiles stagger into place (60ms stagger, 800ms total), then idle in synchronized loops (each tile loop offset so the page breathes as a single organism).

## 8. Layout tendencies
12-col grid, 4-row tiles. Tile sizes: 1×1 (small label), 2×1 (medium feature), 2×2 (anchor demo), 4×2 (hero), 6×1 (banner ribbon). Density 6 — each tile carries an icon + label + 1-line description. py-24 between sections. Mobile collapse: cells stack vertically, coordinated motion downgrades to sequential scroll reveals.

## 9. Component vocabulary
Good fits:
- Magic UI `bento-grid` as primary scaffold (richer motion than Aceternity equivalent).
- Aceternity `bento-grid` for layouts that need 3d-pin tiles.
- Magic UI `animated-list` inside ledger tiles (event feed, recent activity).
- Aceternity `card-hover-effect` for individual tile hover states.
- Aceternity `3d-pin` for one anchor showcase tile (max 1 per bento).
- Magic UI `marquee` inside long ribbon tile (logo wall as a cell).
- Magic UI `animated-shiny-text` on hero tile headline (sparingly).
- R3F `Float` for one playful 3D tile (gated by MI=7).
- GSAP ScrollTrigger for cross-cell coordination timeline.

Weak fits: poster slabs, full-bleed photography, magazine serifs, kinetic typography, scroll-scrubbed image sequences (those want `cinematic-product`).

## 10. Motion profile
SI: cross-cell coordination — when tile A expands, B-H dim 30% opacity; scroll-coupled tile sequence reveals (stagger 60ms); idle micro-loops per tile offset by 200ms each so the grid breathes; layout transitions when tiles resize (Framer Motion `layout` prop); subtle Y-translate (4-8px) on hover; signal-color glow on active tile.
NO: bouncy springs (breaks system register), magnetic cursor on tiles (too playful), pinned scrollytelling (this is not cinematic-product), parallax across the grid (breaks tile coherence), random per-tile entrance animations (must be coordinated stagger).
Ease: `cubic-bezier(0.32, 0.72, 0, 1)` (Apple), `cubic-bezier(0.16, 1, 0.3, 1)` for layout transitions. Durations 400-800ms for tile state changes, 200ms for hover micro.

## 11. Copy tone
Calm-confident, system-aware, specific. Each tile label is one noun phrase, each tile body is one specific sentence. No marketing fog.
Good headlines:
- "Eight surfaces. One platform."
- "Search. Chat. Build. Ship."
- "Every tile is a feature you can ship today."

Forbidden headlines:
- "Empower your workflow"
- "Seamlessly integrated"
- AI clichés (next-gen, revolutionize, unleash).
- Vague tile labels ("Better", "Faster", "Smarter").

## 12. Forbidden patterns (additional to the 13 global)
- Tiles animated independently with no cross-cell logic (defeats the archetype).
- 3-up equal feature card row below the bento (redundant).
- Hero-metric template inside a tile.
- Static png screenshots inside tiles (must be live/looping/animated).
- Glassmorphism tile surfaces (use hairline ring instead).
- Per-tile gradient backgrounds in different palettes (must share system palette).
- Bouncing chevrons or "scroll to explore" prompts.
- Tiles with mixed corner radii (must be uniform across the system).

## 13. Reference brands
- Apple Intelligence feature pages (apple.com/apple-intelligence) — coordinated AI feature bento.
- Spotify Wrapped 2024-2025 (spotify.com/wrapped) — story-driven coordinated cells.
- Linear feature pages (linear.app/features) — clean bento with tile-coupled motion.
- Vercel feature pages 2026 (vercel.com/features) — platform capability grid.
- Cursor pricing/features (cursor.com) — AI tool bento with live demo tiles.
