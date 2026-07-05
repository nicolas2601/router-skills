# Archetype: soft-brutalism

## 1. Identity
Bold structure + warm edges. Playful severity. Big type, hard contrast, but rounded corners, warm palettes, friendly photography. Creator tools, culture, contemporary fashion-tech.

## 2. When to use
- Creator tools, indie SaaS, trend brands, culture publications, lifestyle commerce with attitude.
- Brief mentions: "bold but warm", "playful", "contemporary", "trend", "creator", "edgy but friendly".
- Brands sitting between brutalism and soft.

## 3. When NOT to use
- Premium/serious B2B.
- Editorial publications.
- Luxury hospitality.
- Brief mentions "calm", "quiet", "minimal".

## 4. Baseline dials
- DV: 6
- MI: 4
- VD: 4

## 5. Palette strategy
Committed warm-bold. Tuned off-black/off-white + two saturated accents pulled toward warm tones.

```css
/* Paleta A — cream + coral + ink */
--bg:        oklch(0.95 0.014 85);    /* warm cream */
--ink:       oklch(0.16 0.012 50);    /* warm off-black */
--accent:    oklch(0.68 0.20 30);     /* hot coral */
--accent-2:  oklch(0.55 0.18 145);    /* deep green */
--surface:   oklch(0.91 0.014 85);

/* Paleta B — butter + magenta + ink */
--bg:        oklch(0.96 0.022 95);
--ink:       oklch(0.18 0.014 50);
--accent:    oklch(0.62 0.22 350);    /* magenta */
--accent-2:  oklch(0.75 0.18 80);     /* mustard */
--surface:   oklch(0.93 0.022 95);

/* Paleta C — paper + electric blue + brick */
--bg:        oklch(0.96 0.010 90);
--ink:       oklch(0.18 0.012 50);
--accent:    oklch(0.55 0.22 260);    /* electric blue */
--accent-2:  oklch(0.60 0.18 30);     /* brick */
--surface:   oklch(0.92 0.010 90);
```

## 6. Typography
Display: Cabinet Grotesk Bold, Gambarino, Clash Display, Migra Italic.
Body: Söhne, Plus Jakarta Sans, Satoshi.
Mono: GT America Mono, Geist Mono.
Scale ratio: 1.5 (aggressive). H1 clamp(56px, 10vw, 160px). Mixed scripts (display serif italic + grotesk uppercase).

## 7. Hero direction
Big colored slab + giant title + framed photograph (round corners 12-20px). Asymmetric overlap: title overlaps image edge. Two-color zones in same viewport.

## 8. Layout tendencies
12-col with strong overlap moves. Density 4 — generous but dense within scenes. Sections use colored full-bleed bands with content sitting in tight 8-col container. py-24 with full-width banners between.

## 9. Component vocabulary
Good fits:
- React Bits `bounce-cards`, `splash-cursor`, `flowing-menu`.
- Aceternity `text-reveal-card`, `lamp-effect` (warm tone).
- GSAP `directional-marquee` (medium speed, colored bg).
- Custom: color-block sections, framed Polaroid-style images, sticker tags, hard-edge buttons with soft fill.

Weak fits: dark-luxe slow spotlights, editorial serifs as primary, dashboards, gallery-minimal sparseness.

## 10. Motion profile
SI: punchy springs on hover (stiffness 400, damping 20), color band wipe on scroll, marquee at moderate speed, text mask reveal with character stagger, hover tilt (max 6deg).
NO: slow cinematic fades, magnetic on every CTA, 3D spectacle.
Ease: cubic-bezier(0.5, 1.5, 0.6, 1) (overshoot) for hover. Durations 250-500ms.

## 11. Copy tone
Witty, direct, slightly informal. Strong verbs.
Good headlines:
- "Make stuff. Ship it. Get paid."
- "Tools we wished we had at 22."
- "Loud about quiet things."

Forbidden headlines:
- "Empowering creators"
- "Unleash your potential"
- "Next-gen creator economy".

## 12. Forbidden patterns (additional to the 13 global)
- More than two accent colors active at once.
- Pure black + pure white extremes (must be tuned).
- Gradients on text.
- Glassmorphism on primary surfaces.
- Three equal feature cards.
- Sticky promotional bar.
- All-uppercase body copy.

## 13. Reference brands
- Stripe Press (press.stripe.com).
- Posthog (posthog.com).
- Resend (resend.com) launch pages.
- Default.com (default.com).
