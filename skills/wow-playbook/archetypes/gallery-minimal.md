# Archetype: gallery-minimal

## 1. Identity
Image-led exhibition pacing. The site is a hung wall — large works breathing in white silence with minimal chrome. Curation over conversion.

## 2. When to use
- Photographers, illustrators, artists, design portfolios, exhibition micro-sites.
- Brief mentions: "portfolio", "gallery", "exhibition", "showcase", "image-led", "visual-first".
- Service brands selling craft (architects, ceramicists, set designers).

## 3. When NOT to use
- Text-dense publications.
- Product pages with specs.
- Dashboards, analytics, fintech.
- Brief mentions "convert", "growth", "lead capture", "dense info".

## 4. Baseline dials
- DV: 4
- MI: 3
- VD: 2

## 5. Palette strategy
Restrained. Off-white wall + tuned ink + zero accent — the artwork is the color. Optionally one tiny accent for navigation hover only.

```css
/* Paleta A — white wall */
--bg:        oklch(0.98 0.004 80);   /* gallery wall */
--ink:       oklch(0.18 0.008 50);
--muted:     oklch(0.55 0.01 60);
--line:      oklch(0.90 0.005 80);
--accent:    oklch(0.55 0.18 30);    /* tiny brick (navigation only) */

/* Paleta B — bone wall */
--bg:        oklch(0.95 0.012 85);
--ink:       oklch(0.20 0.012 50);
--muted:     oklch(0.50 0.012 60);
--line:      oklch(0.86 0.012 85);

/* Paleta C — slate wall (dark mode) */
--bg:        oklch(0.18 0.008 250);
--ink:       oklch(0.94 0.005 80);
--muted:     oklch(0.62 0.01 250);
--line:      oklch(0.30 0.012 250);
```

## 6. Typography
Display: PP Editorial New (small), Instrument Serif, Söhne (display weight rarely).
Body: Söhne, Geist (light weights).
Mono: Geist Mono for image metadata, captions.
Scale ratio: 1.25 — soft jumps. Display kept SMALL (heroes 32-48px), images are the loud element.

## 7. Hero direction
Hero is a single large image, full-bleed or framed with generous margin (5-10vw). Title sits below the image as caption, small. No big H1. Optional metadata rail (year, medium, location) right-aligned.

## 8. Layout tendencies
Asymmetric grid with varied image sizes. Density 2 — gallery mode. py-32 minimum between scenes. Mostly single-column on mobile, irregular masonry on desktop. Whitespace is structural: empty space frames each work.

## 9. Component vocabulary
Good fits:
- Aceternity `hero-parallax` (one row, slow).
- React Bits `image-trail` (subtle).
- 21st.dev image grid with intentional irregular sizing.
- GSAP image-reveal with mask wipe.
- Custom: caption rail, year/medium metadata, lightbox modal with morph transition.

Weak fits: bento dense grids, dashboards, focus-cards, marquees of text, magnetic CTAs, scroll-scrubbed WebGL spectacle.

## 10. Motion profile
SI: slow fade-in per image (1s ease-out), gentle parallax (max 4% Y), hover-only caption reveal, lightbox open/close with image morph.
NO: hard cuts, marquees, magnetic interactions, kinetic typography, 3D.
Ease: cubic-bezier(0.16, 1, 0.3, 1). Durations 800-1400ms.

## 11. Copy tone
Captions, not slogans. Year. Medium. Place. Name.
Good headlines:
- "Untitled (Coastline). 2024. Silver gelatin print."
- "Selected work, 2018–2026."
- "Studio open Thursdays by appointment."

Forbidden headlines:
- "Capturing moments that matter"
- "Visual storyteller"
- "Award-winning photographer".

## 12. Forbidden patterns (additional to the 13 global)
- Image hover scale-up (the image is finished — don't disturb it).
- Decorative gradients of any kind.
- Big H1 hero (image is hero).
- Dense image grid (3+ cols equal) — must be irregular.
- CTA banners.
- Footer with newsletter signup as primary action.

## 13. Reference brands
- Vincent Van Duysen architecture (vincentvanduysen.com).
- Margaret Howell (margarethowell.co.uk).
- Iwan Baan photography portfolio.
- Studio Mast (studiomast.co).
