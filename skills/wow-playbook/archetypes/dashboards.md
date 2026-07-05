# Archetype: dashboards

## 1. Identity
Dense data, mono numerals, terminal-like clarity. Operator tools where information per pixel matters and nothing is decorative.

## 2. When to use
- Analytics platforms, BI tools, admin panels, observability products, trading interfaces.
- Brief mentions: "dashboard", "ops", "data", "metrics", "monitor", "console", "command center", "B2B internal".
- Product types: SaaS analytics, infra panels, internal tools, fintech ops, DevOps.

## 3. When NOT to use
- Consumer marketing pages.
- Brand storytelling.
- Anything where the page must "feel" before it informs.
- Brief mentions "premium feel", "editorial", "cinematic", "warm".

## 4. Baseline dials
- DV: 4
- MI: 1
- VD: 8

## 5. Palette strategy
Committed dark or committed light, never mix. Subtle systemic accents (status colors). No decorative tints.

```css
/* Paleta A — dark ops */
--bg:        oklch(0.13 0.005 250);
--surface:   oklch(0.16 0.008 250);
--ink:       oklch(0.94 0.005 80);
--muted:     oklch(0.62 0.008 250);
--accent:    oklch(0.72 0.16 240);   /* signal cyan */
--success:   oklch(0.74 0.18 145);
--warning:   oklch(0.82 0.16 85);
--error:     oklch(0.65 0.22 25);

/* Paleta B — light ops */
--bg:        oklch(0.99 0.003 80);
--surface:   oklch(0.97 0.005 80);
--ink:       oklch(0.20 0.008 250);
--muted:     oklch(0.55 0.012 250);
--accent:    oklch(0.55 0.18 240);
--success:   oklch(0.55 0.16 145);
--warning:   oklch(0.68 0.16 70);
--error:     oklch(0.55 0.22 25);

/* Paleta C — terminal green */
--bg:        oklch(0.10 0.008 145);
--surface:   oklch(0.14 0.012 145);
--ink:       oklch(0.92 0.04 145);   /* phosphor tint */
--accent:    oklch(0.78 0.18 145);
--muted:     oklch(0.55 0.02 145);
```

## 6. Typography
Display: Geist, Söhne (never serif here — kills technical clarity).
Body: Geist, Söhne.
Mono: JetBrains Mono, Geist Mono, IBM Plex Mono — used liberally for IDs, IPs, tabular numerals.
Scale ratio: 1.2 (tight, dense). Body 13-14px, micro labels 11px tabular-nums.

## 7. Hero direction
Often no marketing hero — first scene is the actual interface preview or a command-bar simulation. If marketing page, hero = static console screenshot with live status badge + one tight tagline. Centered hero allowed here (DV=4).

## 8. Layout tendencies
Grid: 24-col or 16-col precision. Density 8 — tight gutters (8-12px), aligned tabular data. Whitespace: minimal, used as separator not luxury. Sticky toolbars, fixed sidebars.

## 9. Component vocabulary
Good fits:
- 21st.dev data-table, command-palette, kbd.
- Aceternity `glowing-stars-background` (subtle, only as ambient).
- Magic UI `animated-list` for live feeds.
- Custom: tabular numerals (`font-variant-numeric: tabular-nums slashed-zero`), sparklines, status pills, key-value rails.

Weak fits: bento cards (data wants tables), parallax, hero-parallax, focus-cards, dark-luxe spotlight.

## 10. Motion profile
SI: instant state changes, live data tick animations (number flip), skeleton loaders matching real layout, slide-in side panels (fast 150-200ms).
NO: scroll choreography, parallax, magnetic cursors, mask reveals, 3D, marquees.
Ease: cubic-bezier(0.4, 0, 0.2, 1) — fast and utilitarian. Durations ≤200ms.

## 11. Copy tone
Operational, precise, terse. Real numbers only.
Good headlines:
- "Trace any request across 14 services."
- "Live ops for distributed teams."
- "Read your infrastructure like a sentence."

Forbidden headlines:
- "Unlock data insights"
- "Seamless observability platform"
- Fake metrics like "99.99% uptime / 124ms p99".

## 12. Forbidden patterns (additional to the 13 global)
- Decorative gradients (data IS the decoration).
- Serif fonts anywhere except a press-release blog page.
- 3D shaders, particles, scroll WebGL.
- Bento card grid as primary content shape.
- Marquees, parallax, magnetic interactions.
- Rounded-2xl on data containers (radius ≤6px).
- Centered hero copy with three feature cards.

## 13. Reference brands
- Linear (linear.app) — feature pages and product UI.
- Vercel dashboard product page (vercel.com).
- Grafana Cloud (grafana.com).
- Datadog observability pages (datadoghq.com).
