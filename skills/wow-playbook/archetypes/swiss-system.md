# Archetype: swiss-system

## 1. Identity
Rational, grid-led, typographic clarity. Institutional confidence. Strong vertical/horizontal rules, single-family typography (often a grotesk), zero ornament. Helvetica school descendant.

## 2. When to use
- Design-forward brands, cultural institutions, design portfolios, systems-thinking products.
- Brief mentions: "swiss", "grid", "rational", "institutional", "classic", "design system", "neue grotesk".
- Brands that want to read as "serious about craft".

## 3. When NOT to use
- Consumer warm products.
- Brutalist campaigns.
- Cinematic launches.
- Brief mentions "playful", "loud", "cinematic", "warm".

## 4. Baseline dials
- DV: 4
- MI: 1
- VD: 5

## 5. Palette strategy
Restrained. Off-white + tuned ink + one strong but small accent (typically red — the Swiss tradition).

```css
/* Paleta A — paper + Swiss red */
--bg:        oklch(0.98 0.005 80);
--ink:       oklch(0.18 0.008 50);
--muted:     oklch(0.50 0.012 60);
--accent:    oklch(0.55 0.22 28);     /* Swiss red */
--line:      oklch(0.20 0.008 50);

/* Paleta B — slate (dark mode) */
--bg:        oklch(0.16 0.008 250);
--ink:       oklch(0.96 0.005 80);
--muted:     oklch(0.62 0.012 250);
--accent:    oklch(0.70 0.18 50);     /* signal orange */
--line:      oklch(0.94 0.005 80);

/* Paleta C — bone + ink-blue */
--bg:        oklch(0.96 0.008 90);
--ink:       oklch(0.20 0.014 250);
--muted:     oklch(0.50 0.014 250);
--accent:    oklch(0.45 0.18 250);    /* ink blue */
--line:      oklch(0.22 0.014 250);
```

## 6. Typography
Display: Söhne, Söhne Breit, Neue Haas Grotesk Display, Helvetica Now (if licensed).
Body: same grotesk single family. Single-family typography IS the Swiss move.
Mono: Geist Mono for occasional metadata.
Scale ratio: 1.25 (modular). H1 clamp(48px, 6vw, 88px) — restrained, not screaming.

## 7. Hero direction
Strict grid hero. Title left-aligned to grid column, sub-info aligned right to grid column. Optional one geometric mark (circle, square, diagonal rule). Centered hero allowed at DV=4 if it serves grid symmetry, but asymmetric preferred.

## 8. Layout tendencies
Strict 12-col or 16-col grid, visible rules. Density 5 — balanced. py-24. Sections separated by hairline rules + section number ("01 / Mission"). Tabular numerals everywhere.

## 9. Component vocabulary
Good fits:
- 21st.dev table layouts, tabs, list views.
- React Bits `text-cursor`, `scroll-reveal` (extremely restrained).
- GSAP minimal SplitText on display.
- Custom: section index rail, ruled dividers, type-spec ledger, year/section stamps.

Weak fits: bento, marquees, magnetic, 3D, gradients, gallery-minimal looseness, soft pastels.

## 10. Motion profile
SI: hairline rule draw-in on scroll, character stagger on display (subtle), opacity fade on entry. THAT IS ALL.
NO: scale, parallax, magnetic, 3D, marquees, springs.
Ease: cubic-bezier(0.4, 0, 0.2, 1). Durations 200-400ms.

## 11. Copy tone
Documentary, exact, neutral. Numbered.
Good headlines:
- "01 / Independent design office."
- "Selected work. 2018–2026."
- "Mission. Method. Output."

Forbidden headlines:
- "Crafted with passion"
- "Bringing your vision to life"
- Any verb starting with "Re-" or "Un-".

## 12. Forbidden patterns (additional to the 13 global)
- Mixing typeface families.
- Decorative gradients.
- Curved/rounded surfaces (use radius ≤4px max).
- Italic display fonts.
- Drop shadows.
- Photographic backgrounds behind text.
- Three feature cards.
- "Trusted by" logo strip.

## 13. Reference brands
- Mast Studio (madebymast.com).
- Studio Spass.
- Lars Müller Publishers (lars-mueller-publishers.com).
- Bureau Mirko Borsche.
