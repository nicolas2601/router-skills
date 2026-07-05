# Archetype: anti-grid-brutalism

> v2.1 — emerging dominant archetype in Awwwards SOTD 2025-2026. More raw than classic `brutalism` (DV:6). The grid is broken on purpose, not stylized.

## 1. Identity
Counter-cultural reaction to ubiquitous bento. Layouts deliberately broken, raw HTML aesthetic exposed, high-tension typography, asymmetry pushed to the wall. Looks like view-source is part of the design language. Not nostalgic — confrontational and current.

## 2. When to use
- Counter-positioned brands: indie tools, alt-publishing, art-tech, music labels, manifesto pages, agency portfolios that want to break from peers.
- Brief mentions: "anti-bento", "raw", "broken grid", "unstyled", "html-first", "post-figma", "no template", "weird on purpose", "agency portfolio".
- Product types: design agencies, type foundries, niche music platforms, conceptual brand launches.
- Voice signals: declarative, opinionated, against-the-grain.

## 3. When NOT to use
- B2B SaaS targeting enterprise buyers.
- Healthcare, fintech, government, insurance.
- Brief mentions "trust", "premium service", "professional", "clean", "enterprise-ready".
- Content-marketing pages where readability over 60s is the primary job.
- Mobile-first apps with thumb-zone constraints.

## 4. Baseline dials
- DV: 9
- MI: 3
- VD: 4

DV=9 reasoning: this archetype pushes asymmetry to near-max. Elements off-baseline by intent, type-sizes from 11px to 320px in the same viewport, rules running off-canvas, blocks rotated 1-3deg. Stops short of DV=10 (which would be pure abstract poster, unreadable as web).

MI=3 reasoning: motion is intentionally restrained — hard cuts and instant state changes only. The chaos is structural, not animated. Anything more becomes "loud" instead of "anti".

VD=4 reasoning: paradoxically restrained density. Each scene carries 1-2 ideas in a giant footprint. The drama is the misalignment, not the count.

## 5. Palette strategy
Restrained, committed contrast. Two inks + one raw industrial neutral, or single-ink monochrome with one electric accent. Never gradients. Never multi-stop palettes.

```css
/* Paleta A — raw HTML default */
--bg:        oklch(0.97 0.005 95);    /* unstyled paper */
--ink:       oklch(0.14 0.01 50);     /* near-black */
--accent:    oklch(0.68 0.24 25);     /* link-red */
--line:      oklch(0.20 0.02 50);
--rule:      oklch(0.85 0.008 95);

/* Paleta B — toner monochrome */
--bg:        oklch(0.92 0.005 110);   /* photocopy gray */
--ink:       oklch(0.12 0.005 110);   /* toner black */
--accent:    oklch(0.65 0.26 145);    /* electric green */
--line:      oklch(0.18 0.005 110);

/* Paleta C — inverted terminal */
--bg:        oklch(0.10 0.005 250);   /* dark cell */
--ink:       oklch(0.96 0.003 95);    /* paper white */
--accent:    oklch(0.78 0.22 75);     /* signal amber */
--line:      oklch(0.30 0.008 250);

/* Paleta D — bone + ink */
--bg:        oklch(0.95 0.012 80);    /* bone */
--ink:       oklch(0.18 0.02 260);    /* ink-blue */
--accent:    oklch(0.58 0.20 320);    /* magenta poster */
--line:      oklch(0.25 0.02 260);
```

## 6. Typography
Display: Cabinet Grotesk Black + Cabinet Grotesk Thin (extreme weight mix in same line), Gambarino, Migra Italic, PP Editorial New (only for irony — serif placed where sans is expected).
Body: Satoshi, Plus Jakarta Sans, Söhne.
Mono: JetBrains Mono, GT America Mono — used as primary body font in 1-2 scenes for raw-HTML feel.
Scale ratio: 1.618 (golden, aggressive). H1 clamp(64px, 18vw, 320px). Captions tiny (11-12px). The jump between scales is the design.

If Geist is required: use `next/font/local` with vendored Geist files or `@vercel/geist-font` — NOT `next/font/google` (that import is broken).

## 7. Hero direction
Hero is the system breaking. Title in 18vw set against a 12px metadata line two grid columns away. Element rotated -1.5deg. Page rule running off-canvas right. No imagery as hero — typography IS the imagery. If imagery present: cropped flush to viewport edge, no breathing room, no caption alignment. Asymmetric baselines per element (text at different vertical anchors on purpose).

## 8. Layout tendencies
12-col grid declared then violated. Elements span 3, 5, 11 cols randomly (no even splits). Whitespace in giant uneven blocks — one scene py-64, next scene py-12. Density 4 — single anchor per scene, but the anchor is enormous and off-axis. Rules and hairlines bleed off the viewport intentionally. No card chrome.

## 9. Component vocabulary
Good fits:
- GSAP `directional-marquee` at constant linear speed (mechanical, not eased)
- React Bits `split-text` with hard-cut stagger (no smooth ease)
- React Bits `text-cursor` for blinking caret on input-like display elements
- GSAP `text-masking` with hard reveal (no fade)
- Custom: rotated slab, off-canvas rule, raw form field (browser-default styling visible), unstyled list with markdown bullets, view-source caption strip.

Weak fits: Aceternity `bento-grid` (the thing this archetype rejects), Magic UI `bento-grid`, glassmorphism, `card-hover-effect`, focus-cards, magnetic CTAs, `moving-border`, gradient meshes, springs.

## 10. Motion profile
SI: hard cuts on text reveals, instant state swaps on hover, marquee at constant linear speed (mechanical), single rotation tick on element entry (90ms, no ease), CRT-style scanline on accent elements (optional).
NO: smooth ease curves on decorative motion, magnetic buttons, hover scale, floating loops, springs, parallax, scroll-scrubbed media.
MI=3 ceiling: motion exists only to acknowledge state change, never to entertain.
Ease: `linear` (justified exception to Law 12 for marquees and mechanical reveals), `steps(8)` for typewriter effects.

## 11. Copy tone
Declarative, op-ed, against-the-grain. Title as opinion, not slogan. Body copy reads like a manifesto footnote.
Good headlines:
- "Bento is over."
- "We refuse to use focus-cards."
- "Designed in browser. Shipped in browser."
- "There is no design system. There is taste."

Forbidden headlines:
- "Crafted experiences for the modern web"
- "Elevating design culture"
- Anything with "seamless", "elevate", "unleash", "next-gen".
- Em dashes as decoration.

## 12. Forbidden patterns (additional to the 13 global)
- Bento grids of any kind (this is the literal anti-thesis).
- Smooth ease curves on text reveals.
- Centered hero (DV=9 absolutely forbids it).
- Drop shadows of any flavor.
- Soft rounded corners on primary surfaces (radius 0px only, no exceptions).
- Subtle hover scale animations.
- 3-up feature card grids.
- "Premium" or "elegant" copy register.
- Decorative gradients of any kind.
- Glassmorphism surfaces.
- Skeuomorphic anything.

## 13. Reference brands
- Hassan Rahim studio (hassanrahim.com) — raw typographic poster work translated to web.
- Output Studio (output.is) — anti-bento agency portfolio, broken-grid case studies.
- Nordhem (nordhem.se) — Swedish indie agency, off-axis editorial brutalism.
- Resn (resn.co) — poster-led culture work, but with anti-grid bent in 2025 redesigns.
- Folder Studio (folderstudio.com) — type-foundry asymmetric chaos.
