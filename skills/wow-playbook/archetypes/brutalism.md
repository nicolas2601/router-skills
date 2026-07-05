# Archetype: brutalism

## 1. Identity
Raw, poster-led, confrontational. Web that looks like it was printed on industrial concrete and handed to you by hand. Visible structure, big type, hard edges, no apologies.

## 2. When to use
- Cultural, music, fashion, art-tech, alt-publishing, manifesto pages.
- Brief mentions: "bold campaign", "poster", "manifesto", "loud", "no bullshit", "ugly on purpose", "underground", "zine".
- Product types: festivals, art studios, indie magazines, conceptual portfolios, drop announcements.
- Voice signals: confrontational, declarative, single-idea pages.

## 3. When NOT to use
- B2B SaaS targeting enterprise buyers.
- Financial, healthcare, hospitality.
- Brief mentions "trust", "premium service", "elegant", "calm".
- Any page where reading long-form prose is the primary job.

## 4. Baseline dials
- DV: 6
- MI: 2
- VD: 3

## 5. Palette strategy
Restrained palette, committed contrast. Two strong inks + one industrial neutral. Never gradients as decoration.

```css
/* Paleta A — concrete ink */
--bg:        oklch(0.93 0.005 95);   /* paper concrete */
--ink:       oklch(0.16 0.01 50);    /* off-black ink */
--accent:    oklch(0.62 0.21 28);    /* poster red */
--line:      oklch(0.18 0.02 50);

/* Paleta B — riso pop */
--bg:        oklch(0.96 0.02 85);    /* warm cream */
--ink:       oklch(0.20 0.02 250);   /* deep navy */
--accent:    oklch(0.78 0.18 95);    /* riso yellow */
--line:      oklch(0.30 0.03 250);

/* Paleta C — toner gray */
--bg:        oklch(0.88 0.005 110);  /* newspaper gray */
--ink:       oklch(0.14 0.005 110);  /* toner black */
--accent:    oklch(0.55 0.22 35);    /* hot orange */
--line:      oklch(0.20 0.005 110);
```

## 6. Typography
Display whitelist: Cabinet Grotesk Black, Clash Display Bold, Migra Italic, Gambarino.
Body: Söhne, Plus Jakarta Sans, Satoshi.
Mono: JetBrains Mono, GT America Mono for tags.
Scale ratio: 1.5 (aggressive jump between display and body). H1 clamp(56px, 12vw, 200px).

## 7. Hero direction
Poster hero. One enormous word/sentence + one structural element (rule, slab, photographic crop). Asymmetry hard: text aligned to grid edge, image cropped flush to viewport. No centered hero ever (DV=6). No drop shadow — only border-bottom rules.

## 8. Layout tendencies
12-col grid, gutters wide (2rem+), explicit rules between sections. Density medium-low — single idea per scene. Whitespace pattern: "rooms" — each scene gets py-32+ with a single anchor.

## 9. Component vocabulary
Good fits:
- GSAP `directional-marquee` (hard cut transitions)
- React Bits `split-text` with hard-edge stagger
- Aceternity `text-reveal-card` (without smooth ease)
- Custom: poster slab, raw caption rail, rule-divider sections, tag cloud.

Weak fits: glassmorphism, bento grids, focus-cards (too polished), magnetic CTAs, gradient meshes.

## 10. Motion profile
SI: hard cuts, instant state changes, marquee scrolls at constant linear speed (the one exception to Law 12 banning linear — for marquees it reads as mechanical, not lazy).
NO: smooth ease curves on decorative motion, magnetic buttons, hover scale, floating loops, springs.
Keep MI=2: motion exists only when it serves declarative pacing (text appears, rule slides in, image cuts in).

## 11. Copy tone
Declarative. Imperative. Short. Period.
Good headlines:
- "We make tools. They break. We fix them."
- "Not a studio. A workshop."
- "Festival 2026. October 12. Show up."

Forbidden headlines:
- "Empower your creative journey"
- "Seamless creative solutions"
- Anything with em dashes as decoration or "elevate"/"unleash".

## 12. Forbidden patterns (additional to the 13 global)
- Smooth ease curves on text reveals.
- Decorative gradients of any kind.
- Centered hero (DV=6).
- Bento card layouts.
- Soft rounded corners on primary surfaces (radius ≤4px max).
- Subtle hover scale.
- Drop shadows of any flavor.
- "Premium" or "elegant" copy register.

## 13. Reference brands
- Resn (resn.co) — poster-led culture work.
- Hassan Rahim studio (hassanrahim.com) — raw typographic posters.
- Soulland Studio releases — campaign micro-sites.
- LCD Soundsystem tour landings — hard-cut event design.
