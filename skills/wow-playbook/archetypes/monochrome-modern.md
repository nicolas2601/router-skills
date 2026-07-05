# Archetype: monochrome-modern

## 1. Identity
Tight black/white system with one micro-accent. Crisp, contemporary, system-forward. Portfolios, agencies, design products that want to feel disciplined and current without going editorial.

## 2. When to use
- Agencies, design studios, portfolio sites, design-led product pages.
- Brief mentions: "mono", "black & white", "modern", "current", "design-forward", "studio".
- Brands where typographic precision is the identity.

## 3. When NOT to use
- Soft consumer products (use soft or warm-modern).
- Image-heavy galleries (use gallery-minimal).
- Brief mentions "warm", "playful", "soft", "colorful".

## 4. Baseline dials
- DV: 5
- MI: 4
- VD: 5

## 5. Palette strategy
Committed. 95% off-black/off-white + one micro-accent (5% coverage max).

```css
/* Paleta A — pure mono + neon hint */
--bg:        oklch(0.97 0.005 80);
--ink:       oklch(0.15 0.008 50);
--muted:     oklch(0.55 0.01 60);
--accent:    oklch(0.78 0.20 130);    /* lime micro-hit */
--line:      oklch(0.88 0.005 80);

/* Paleta B — dark mono + coral hint */
--bg:        oklch(0.14 0.008 250);
--ink:       oklch(0.96 0.005 80);
--muted:     oklch(0.60 0.01 250);
--accent:    oklch(0.68 0.18 25);     /* coral hint */
--line:      oklch(0.24 0.012 250);

/* Paleta C — warm mono + electric blue */
--bg:        oklch(0.96 0.012 90);    /* tinted off-white */
--ink:       oklch(0.18 0.012 50);
--muted:     oklch(0.52 0.015 60);
--accent:    oklch(0.62 0.22 260);    /* electric blue */
--line:      oklch(0.86 0.012 90);
```

## 6. Typography
Display: Cabinet Grotesk, Söhne Breit, PP Neue Montreal, Clash Display.
Body: Söhne, Plus Jakarta Sans, Geist.
Mono: Geist Mono, GT America Mono.
Scale ratio: 1.333. H1 clamp(48px, 7vw, 96px). Mixed weights within a headline (Bold + Light).

## 7. Hero direction
Asymmetric split. Big tight display headline left, tight metadata column right (year/discipline/clients). Optional one small object/screenshot floating. Centered hero banned (DV=5).

## 8. Layout tendencies
12-col with strong rules between sections. Density 5 — balanced. Sections alternate between text-dense and image-dense. py-24 default.

## 9. Component vocabulary
Good fits:
- GSAP `directional-marquee` for client logos (slow).
- React Bits `text-cursor`, `split-text`, `scroll-reveal`.
- Aceternity `text-reveal-card` for project hovers.
- 21st.dev tabs and tags hairline.
- Custom: index rail, project ledger, year-stamp metadata.

Weak fits: dark-luxe spotlights, soft pastels, gallery-minimal sparseness, dense bento.

## 10. Motion profile
SI: text mask reveal on scroll-in, hover swap (text/image switch), slow marquee, underline link drift, hairline border draw-in.
NO: bouncy springs, gradient pulses, 3D scroll spectacle, magnetic CTAs.
Ease: cubic-bezier(0.65, 0, 0.35, 1). Durations 400-700ms.

## 11. Copy tone
Direct, clipped, slightly cocky. Numbers and years.
Good headlines:
- "Independent design office. Since 2019."
- "Selected work. 14 projects."
- "We design systems, not slides."

Forbidden headlines:
- "Crafted with passion"
- "Bringing your vision to life"
- "Award-winning creative agency".

## 12. Forbidden patterns (additional to the 13 global)
- More than one accent color.
- Decorative gradient backgrounds.
- Three feature cards under hero.
- Logo strip "trusted by" filler.
- Centered hero.
- Hover scale on project cards (use text/image swap instead).
- Mixing warm and cool neutrals.

## 13. Reference brands
- Pentagram (pentagram.com).
- Studio Dumbar (studiodumbar.com).
- Order (orderdesignco.com).
- Buck.co.
