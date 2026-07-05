# Archetype: soft

## 1. Identity
Approachable, rounded, warm. Optimistic without being childish. Consumer apps, education, lifestyle — interfaces that should make a stressed user exhale.

## 2. When to use
- Consumer mobile/web apps (habit, meditation, journaling, family, kids-ed).
- Lifestyle products, community platforms, learning tools.
- Brief mentions: "friendly", "approachable", "warm", "soft", "consumer", "everyday", "calm".

## 3. When NOT to use
- B2B enterprise SaaS.
- Editorial publications.
- Cultural/poster work.
- Brief mentions "serious", "premium", "luxury", "operator tool".

## 4. Baseline dials
- DV: 3
- MI: 3
- VD: 4

## 5. Palette strategy
Committed warm. Pastel-tuned neutrals + one warm accent + one secondary. Soft pastel does NOT mean baby — saturation kept moderate, never washed.

```css
/* Paleta A — cream + coral */
--bg:        oklch(0.97 0.012 80);    /* cream paper */
--surface:   oklch(0.94 0.014 80);
--ink:       oklch(0.24 0.016 40);
--muted:     oklch(0.55 0.018 50);
--accent:    oklch(0.72 0.16 30);     /* warm coral */
--accent-2:  oklch(0.78 0.13 110);    /* sage */

/* Paleta B — peach + lavender */
--bg:        oklch(0.96 0.020 50);
--surface:   oklch(0.93 0.022 50);
--ink:       oklch(0.25 0.018 40);
--muted:     oklch(0.55 0.020 50);
--accent:    oklch(0.75 0.14 40);     /* peach */
--accent-2:  oklch(0.68 0.12 290);    /* muted lavender */

/* Paleta C — butter + mint */
--bg:        oklch(0.97 0.024 95);
--surface:   oklch(0.94 0.026 95);
--ink:       oklch(0.24 0.016 90);
--muted:     oklch(0.55 0.018 90);
--accent:    oklch(0.80 0.14 95);     /* butter yellow */
--accent-2:  oklch(0.72 0.10 165);    /* soft mint */
```

## 6. Typography
Display: Fraunces (modulated weight + soft optical), Outfit, PP Editorial New (soft mode).
Body: Plus Jakarta Sans, Satoshi, Outfit.
Mono: Geist Mono used rarely.
Scale ratio: 1.25. H1 clamp(40px, 5.5vw, 76px). Friendly tracking (-0.01em on display, normal on body).

## 7. Hero direction
Friendly composition. Headline + warm illustration / object photograph / abstract soft shape. Slight asymmetry. Rounded corners on visual containers (16-24px radius). Soft drop shadows tinted to bg.

## 8. Layout tendencies
12-col, comfortable py-24. Density 4 — balanced. Cards with generous padding and rounded-2xl. Soft section dividers (no hard rules).

## 9. Component vocabulary
Good fits:
- Aceternity `gradient-animation` (soft, slow).
- React Bits `pixel-card`, `bounce-cards` (soft springs).
- Magic UI `confetti` (rare, signup celebration).
- Custom: rounded surfaces, soft illustration spots, friendly avatars (real, not generic blobs).
- 21st.dev rounded buttons + chips.

Weak fits: brutalism poster, dashboards, dark-luxe, editorial serif-heavy.

## 10. Motion profile
SI: soft springs (stiffness 200, damping 30), friendly hover lift (translateY -2px + soft shadow), illustration micro-loops, page-transition with cross-fade.
NO: hard cuts, magnetic-aggressive interactions, scroll spectacle, kinetic typography.
Ease: spring-based, OR cubic-bezier(0.34, 1.56, 0.64, 1) (gentle overshoot). Durations 350-600ms.

## 11. Copy tone
Warm, plain, encouraging. Second person. No corporate.
Good headlines:
- "A gentler way to track habits."
- "Read with your kid. Ten minutes a day."
- "Save like a friend would."

Forbidden headlines:
- "Empower your wellness journey"
- "Next-gen lifestyle platform"
- AI-cliché "transform your life".

## 12. Forbidden patterns (additional to the 13 global)
- Childish emoji-driven UI (one emoji per page max — and only if user asked).
- Comic Sans, Pacifico, or any "fun" script font.
- Three-card row of features.
- Bright fully-saturated brand colors (must be tuned, OKLCH chroma ≤0.18).
- Hard ring focus styles (use soft halo focus ring).
- AI-purple-blue gradient.

## 13. Reference brands
- Headspace (headspace.com).
- Duolingo marketing pages.
- Posthog landing (posthog.com) — soft side.
- Notion family/lifestyle pages.
