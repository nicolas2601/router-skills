# Archetype: quiet-luxury

## 1. Identity
Understated, soft, expensive restraint. Wealth that does not announce itself. Pages that feel like a hotel concierge brief — calm, certain, generous space.

## 2. When to use
- Hospitality, wellness, interiors, fine fashion, premium services for affluent buyers.
- Brief mentions: "calm premium", "understated", "refined", "subtle", "soft luxury", "considered".
- Brands selling experiences, not transactions.

## 3. When NOT to use
- Bold campaigns, loud drops, festivals.
- High-energy consumer tech.
- Dashboards.
- Brief mentions "loud", "bold", "campaign", "drop".

## 4. Baseline dials
- DV: 4
- MI: 3
- VD: 4

## 5. Palette strategy
Restrained. Warm stone neutrals + cream + one almost-not-there muted accent (sage, taupe, biscuit).

```css
/* Paleta A — cream + sage */
--bg:        oklch(0.95 0.010 90);    /* cream */
--surface:   oklch(0.92 0.012 90);
--ink:       oklch(0.25 0.014 60);    /* warm charcoal */
--muted:     oklch(0.55 0.012 70);
--accent:    oklch(0.62 0.05 130);    /* muted sage */

/* Paleta B — bone + taupe */
--bg:        oklch(0.94 0.012 85);
--surface:   oklch(0.90 0.014 85);
--ink:       oklch(0.26 0.015 50);
--muted:     oklch(0.52 0.015 60);
--accent:    oklch(0.58 0.04 50);     /* muted taupe */

/* Paleta C — stone + slate */
--bg:        oklch(0.93 0.008 95);
--surface:   oklch(0.89 0.010 95);
--ink:       oklch(0.24 0.012 250);
--muted:     oklch(0.50 0.012 250);
--accent:    oklch(0.45 0.04 250);    /* muted slate */
```

## 6. Typography
Display: Fraunces, PP Editorial New, Migra Light, Instrument Serif.
Body: Söhne Light, Plus Jakarta Sans Light, Satoshi Light.
Mono: Geist Mono for tiny metadata only.
Scale ratio: 1.25. H1 clamp(40px, 5.5vw, 72px) — modest, not screaming.

## 7. Hero direction
Large quiet photograph (interior, material detail, hand-held object) + small title bottom-left. Generous breathing. Optional small wordmark top-left. Centered hero allowed at DV=4 ONLY if image-driven (text minor).

## 8. Layout tendencies
12-col, generous py-32. Density 4. Single image scenes alternating with small text blocks. Margins wide on desktop (10vw+). No card chrome.

## 9. Component vocabulary
Good fits:
- Aceternity `hero-parallax` (very slow).
- React Bits `scroll-reveal` (subtle).
- Custom: large image plate, paired image + paragraph, side metadata rail, sticky chapter index for offerings.
- 21st.dev minimal nav.

Weak fits: bento grids, dashboards, marquees, 3D, magnetic cursors, focus-cards.

## 10. Motion profile
SI: very slow fade-in on images (1.2s), gentle image parallax (max 3% Y), hover underline drift, slow morph transitions on hover (no scale).
NO: bouncy springs, marquees, magnetic, 3D, scroll-scrubbed WebGL.
Ease: cubic-bezier(0.16, 1, 0.3, 1). Durations 900-1500ms.

## 11. Copy tone
Calm, exact, fewer words. No exclamation, no urgency.
Good headlines:
- "Eighteen rooms. One view."
- "Open by reservation."
- "Care, slowly."

Forbidden headlines:
- "Luxury redefined"
- "Elevate your stay"
- "Experience the extraordinary".

## 12. Forbidden patterns (additional to the 13 global)
- Gold gradient text (mass-luxury cliché).
- "Best of" badges, awards, ratings rail.
- Promotional banners ("book now save 15%").
- High-contrast accent colors.
- Glossy black surfaces.
- Bold weights on display.
- Decorative italic flourishes.

## 13. Reference brands
- Aman Resorts (aman.com).
- Six Senses (sixsenses.com).
- Frama (framacph.com).
- The Line LA (thelinehotel.com).
