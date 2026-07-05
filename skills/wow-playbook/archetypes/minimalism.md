# Archetype: minimalism

## 1. Identity
Reduced, calm, high-clarity. Fewer elements doing more. Confidence through omission. Tight type, almost-empty pages, one message per scene.

## 2. When to use
- Quiet startup landings, consulting, professional services, single-product pages.
- Brief mentions: "clean", "minimal", "calm", "simple", "less", "reduced", "focused".
- Pages where the message must arrive in one breath.

## 3. When NOT to use
- Image-heavy portfolios (use gallery-minimal).
- Data-dense ops (use dashboards).
- Cultural/poster work (use brutalism).
- Brief mentions "energetic", "loud", "bold campaign".

## 4. Baseline dials
- DV: 3
- MI: 2
- VD: 3

## 5. Palette strategy
Restrained. Off-white + tuned ink + one quiet accent used sparingly (links, focus rings).

```css
/* Paleta A — paper + ink */
--bg:        oklch(0.98 0.005 80);
--ink:       oklch(0.18 0.008 50);
--muted:     oklch(0.55 0.012 60);
--accent:    oklch(0.55 0.15 250);     /* quiet blue */
--line:      oklch(0.92 0.005 80);

/* Paleta B — chalk + graphite */
--bg:        oklch(0.97 0.006 250);
--ink:       oklch(0.22 0.012 250);
--muted:     oklch(0.55 0.01 250);
--accent:    oklch(0.50 0.12 25);      /* warm red link */
--line:      oklch(0.90 0.005 250);

/* Paleta C — slate (dark mode) */
--bg:        oklch(0.17 0.008 250);
--ink:       oklch(0.95 0.005 80);
--muted:     oklch(0.62 0.01 250);
--accent:    oklch(0.74 0.15 200);
--line:      oklch(0.26 0.012 250);
```

## 6. Typography
Display: Geist, Söhne, Söhne Breit (only at modest sizes).
Body: Geist, Söhne, Inter Display (NOT default Inter).
Mono: Geist Mono.
Scale ratio: 1.25 (gentle). H1 clamp(36px, 5vw, 64px) — restrained, not screaming.

## 7. Hero direction
One headline, one paragraph, one CTA. Off-center (DV=3 still allows slight asymmetry). No image, or one small framed object. Mostly negative space. Centered hero IS allowed at DV≤3.

## 8. Layout tendencies
8-col grid, generous py-32. Density 3. Whitespace = the design. Single-column reading rhythm. Lines, dividers, tonal changes — no panels.

## 9. Component vocabulary
Good fits:
- React Bits `split-text` (subtle).
- 21st.dev minimal `command-menu`.
- Custom: hairline rules, modest button (border + underline), small metadata footer.
- Magic UI `animated-shiny-text` (only for a single feature highlight).

Weak fits: bento cards, hero-parallax, marquees, 3D, magnetic cursors, gradients, focus-cards.

## 10. Motion profile
SI: hover-only state changes, gentle fade-up on section entry (one-time), focus rings with smooth transitions.
NO: scroll spectacle, marquees, magnetic, 3D, parallax.
Ease: cubic-bezier(0.32, 0.72, 0, 1). Durations 300-500ms.

## 11. Copy tone
Plain, exact, edited. Strip filler.
Good headlines:
- "A simpler way to invoice."
- "Read fewer things. Better."
- "We help engineers write."

Forbidden headlines:
- "Unleash your potential"
- "Streamline workflows seamlessly"
- "All-in-one platform".

## 12. Forbidden patterns (additional to the 13 global)
- Gradient text on H1.
- Three feature cards under hero.
- Logo strip "trusted by" filler.
- Sticky promotional bar.
- Toggleable dark/light switcher as primary nav element.
- Glassmorphism.
- Hover scale on cards.
- Two-color accent system (only one quiet accent allowed).

## 13. Reference brands
- Mercury Bank pre-rebrand pages (mercury.com).
- Linear early landing pages (linear.app).
- Plain (plain.com).
- Vlad Magdalin's notes (vlad.studio).
