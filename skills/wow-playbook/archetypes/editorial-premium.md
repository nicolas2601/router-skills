# Archetype: editorial-premium

## 1. Identity
European design publication translated to web. Serif display, paper whites, image plates, careful pacing. Reads like a designed magazine, not a content-marketing page.

## 2. When to use
- Studios, fashion editorial, hospitality, architecture, design publications.
- Brief mentions: "editorial", "magazine", "publication", "journal", "longform", "studio", "essay".
- Service brands where craft and prose matter more than features.

## 3. When NOT to use
- Pure product/data dashboards.
- High-energy consumer apps.
- Brief mentions "punchy", "loud", "campaign", "drop", "dashboard".

## 4. Baseline dials
- DV: 5
- MI: 2
- VD: 4

## 5. Palette strategy
Restrained. Paper white + warm neutrals + one muted editorial accent (brick, terracotta, coral, ink-navy). Light mode by default.

```css
/* Paleta A — paper + brick */
--bg:        oklch(0.97 0.008 85);    /* warm paper */
--surface:   oklch(0.94 0.012 80);    /* stone */
--ink:       oklch(0.22 0.015 50);    /* warm charcoal */
--muted:     oklch(0.50 0.015 60);
--accent:    oklch(0.55 0.14 35);     /* terracotta */

/* Paleta B — bone + navy */
--bg:        oklch(0.96 0.006 90);
--surface:   oklch(0.92 0.008 85);
--ink:       oklch(0.20 0.02 260);    /* deep ink */
--muted:     oklch(0.48 0.018 260);
--accent:    oklch(0.42 0.10 260);    /* publication navy */

/* Paleta C — cream + olive */
--bg:        oklch(0.95 0.012 95);
--surface:   oklch(0.91 0.015 95);
--ink:       oklch(0.24 0.014 90);
--muted:     oklch(0.52 0.018 95);
--accent:    oklch(0.50 0.08 115);    /* muted olive */
```

## 6. Typography
Display: PP Editorial New, Fraunces, Instrument Serif, Migra.
Body: Söhne, Plus Jakarta Sans, Satoshi.
Mono: Geist Mono for captions and metadata only.
Scale ratio: 1.333. Body measure 58-66ch. Generous leading 1.55.

## 7. Hero direction
Image-plate first. Large editorial photograph arrives before or with the title. Split article lead: title 5-col, dek/lede 4-col, breathing space 3-col. Asymmetric 5/7 or 4/8 splits. Never centered hero.

## 8. Layout tendencies
12-col with taxonomy rail. Density 4 — generous py-32, large interstitial image breaks. Whitespace pattern: chapters separated by full-bleed image plates. Pagination feel: previous/next twins at end of articles.

## 9. Component vocabulary
Good fits:
- Aceternity `hero-parallax` for issue covers (subtle, slow).
- Aceternity image-sequence editorial.
- React Bits `split-text` for serif display reveals.
- GSAP `text-masking` for chapter intros.
- Custom: taxonomy rail, margin quote, paired image plate, caption rail tied to plates.

Weak fits: bento dense grids, dashboards, marquees, magnetic CTAs, big colored gradients.

## 10. Motion profile
SI: gentle fade-in on hero, restrained text masking on display headlines, slow image plate appearance (800ms), underline link drifts, subtle parallax on images (max 3% Y).
NO: kinetic typography, pinned scrollytelling spectacle, magnetic cursors, scroll-scrubbed WebGL.
Ease: cubic-bezier(0.32, 0.72, 0, 1). Durations 600-1000ms.

## 11. Copy tone
Cultured, exact, restrained. Title as title, not slogan. Edited prose.
Good headlines:
- "A studio in three rooms, three decades, three editors."
- "Tools we have stopped using, and why."
- "On the persistence of paper."

Forbidden headlines:
- "Elevate your brand"
- "Crafted with passion"
- AI-cliché "next-gen storytelling".

## 12. Forbidden patterns (additional to the 13 global)
- CTA banner between paragraphs.
- Sticky promotional bar in reading view.
- Fake author avatars or generic byline icons.
- Gradient backgrounds.
- Centered blog-post template (Medium-like).
- Three equal article cards as default related-stories layout (use twin instead).
- Decorative em dashes between words.

## 13. Reference brands
- Apartamento Magazine (apartamentomagazine.com).
- The Gentlewoman online (thegentlewoman.co.uk).
- Cereal Magazine (readcereal.com).
- Toiletpaper Magazine landing.
