# Archetype: dark-luxe

## 1. Identity
Moody, sensual, expensive after-dark. Tuned off-black, single rich accent, slow reveals. Velvet rope energy without gold gradient clichés.

## 2. When to use
- Luxury brands (fashion, hospitality, spirits, perfume).
- Premium SaaS targeting senior buyers.
- Nightlife, members-only platforms, fine dining.
- Brief mentions: "luxe", "moody", "premium dark", "exclusive", "after dark", "sensual".

## 3. When NOT to use
- Consumer apps for general audience.
- Education, family-friendly products.
- Anything where readability of long body copy is priority.
- Brief mentions "warm", "friendly", "approachable", "playful".

## 4. Baseline dials
- DV: 5
- MI: 6
- VD: 5

## 5. Palette strategy
Drenched. Single rich accent over deep tuned neutral. Never pure black, never gold gradient.

```css
/* Paleta A — espresso */
--bg:        oklch(0.15 0.012 35);    /* warm tuned black */
--surface:   oklch(0.19 0.015 35);
--ink:       oklch(0.94 0.008 80);
--accent:    oklch(0.65 0.14 25);     /* deep amber */
--muted:     oklch(0.58 0.012 35);

/* Paleta B — bordeaux */
--bg:        oklch(0.14 0.018 15);
--surface:   oklch(0.18 0.022 15);
--ink:       oklch(0.93 0.008 30);
--accent:    oklch(0.50 0.18 18);     /* bordeaux red */
--muted:     oklch(0.55 0.015 15);

/* Paleta C — forest */
--bg:        oklch(0.13 0.015 160);
--surface:   oklch(0.17 0.018 160);
--ink:       oklch(0.94 0.007 100);
--accent:    oklch(0.62 0.14 155);    /* deep moss */
--muted:     oklch(0.52 0.012 160);
```

## 6. Typography
Display: PP Editorial New, Migra, Fraunces, Instrument Serif (italic for emphasis).
Body: Söhne, Plus Jakarta Sans.
Mono: Geist Mono.
Scale ratio: 1.414. H1 clamp(56px, 7vw, 112px). Italic display for emotive moments.

## 7. Hero direction
Slow, atmospheric. Large product/lifestyle photograph with dark lighting. Title sits in lower third. Asymmetric: heavy bottom-left, image bleeds to right. Subtle vignette via radial gradient (decorative use OK in this drenched mode).

## 8. Layout tendencies
12-col grid, generous py-32 sections. Density 5 — balanced. Whitespace is dark mass, not white air. Materials: hairline ring-1 ring-white/8, soft inner highlight, multi-layer tinted shadows.

## 9. Component vocabulary
Good fits:
- Aceternity `background-gradient-animation` (slow, dark).
- Aceternity `spotlight` over hero.
- React Bits `text-reveal` with mask wipe.
- 21st.dev hover-card with hairline border.
- Custom: side-rail metadata, image-with-caption pair.

Weak fits: bento dense grids, dashboards, raw brutalism, soft pastels, three feature cards in a row.

## 10. Motion profile
SI: slow fade-in (1.2s ease-out), gentle parallax on hero image (max 5% Y translate), spotlight follow on hero, slow image carousel with crossfade, subtle scroll-driven vignette.
NO: bouncy springs, magnetic cursor on text, marquees, hard cuts.
Ease: cubic-bezier(0.32, 0.72, 0, 1) ("Apple"), slow durations 800-1200ms.

## 11. Copy tone
Restrained, sensual, fewer words. Confidence through fewer claims.
Good headlines:
- "A room you will not want to leave."
- "Made by hand. Aged in oak."
- "Open from sunset."

Forbidden headlines:
- "Luxury redefined"
- "Elevate your experience"
- Bold all-caps shouty headlines.

## 12. Forbidden patterns (additional to the 13 global)
- Gold gradient text (mass-luxury cliché).
- Glassy reflections / mirror chrome.
- "Champagne" beige + pure black combo.
- Centered hero with floating logo.
- Glowing accent on hover (use rim highlight only).
- Cursive script fonts as display (e.g. Allura, Dancing Script — banned).

## 13. Reference brands
- Aesop product pages (aesop.com).
- Le Labo (lelabofragrances.com).
- Carbon Hotel landings.
- Loro Piana editorial section.
