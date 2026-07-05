# Archetype: warm-modern

## 1. Identity
Contemporary, human, warm, polished — not sterile. Modern SaaS / agency / service brand done with intention. Off-white warm, friendly typography, one warm accent, real photography of real people/spaces.

## 2. When to use
- Agencies, service brands, modern company sites, consumer products that want polish without coldness.
- Brief mentions: "warm", "human", "polished", "professional but friendly", "agency", "company site", "service brand".
- Brand voice: confident but kind.

## 3. When NOT to use
- Bold campaigns (use soft-brutalism or brutalism).
- Dashboards.
- Editorial publications (use editorial-premium).
- Brief mentions "loud", "ops", "dense data", "operator".

## 4. Baseline dials
- DV: 5
- MI: 5
- VD: 5

## 5. Palette strategy
Committed warm. Warm off-white + tuned warm charcoal + one warm accent (terracotta, ochre, brick).

```css
/* Paleta A — cream + terracotta */
--bg:        oklch(0.96 0.012 80);    /* warm cream */
--surface:   oklch(0.93 0.014 80);
--ink:       oklch(0.22 0.014 50);
--muted:     oklch(0.52 0.014 60);
--accent:    oklch(0.58 0.16 40);     /* terracotta */
--line:      oklch(0.86 0.012 80);

/* Paleta B — bone + ochre */
--bg:        oklch(0.95 0.014 90);
--surface:   oklch(0.91 0.016 90);
--ink:       oklch(0.20 0.014 50);
--muted:     oklch(0.50 0.014 60);
--accent:    oklch(0.66 0.14 80);     /* ochre */
--line:      oklch(0.84 0.014 90);

/* Paleta C — graphite + amber (warm dark) */
--bg:        oklch(0.18 0.012 50);    /* warm dark */
--surface:   oklch(0.22 0.014 50);
--ink:       oklch(0.95 0.008 80);
--muted:     oklch(0.62 0.012 60);
--accent:    oklch(0.72 0.16 60);     /* warm amber */
--line:      oklch(0.30 0.014 50);
```

## 6. Typography
Display: Fraunces (modulated), Cabinet Grotesk, Söhne, PP Editorial New (warmer cuts).
Body: Plus Jakarta Sans, Satoshi, Söhne.
Mono: Geist Mono for occasional metadata.
Scale ratio: 1.333. H1 clamp(44px, 6vw, 88px).

## 7. Hero direction
Asymmetric split. Title 5-col, large warm photograph (people, hands, real spaces — not stock smiles) 7-col. Optional small wordmark + section index. Avoid centered hero (DV=5).

## 8. Layout tendencies
12-col, py-24 default. Density 5 — balanced. Mix carded and uncarded sections. Soft hairline dividers tinted to bg.

## 9. Component vocabulary
Good fits:
- Aceternity `hero-parallax` (moderate speed), `card-hover-effect` (warm hover).
- React Bits `scroll-reveal`, `split-text` (gentle stagger).
- Magic UI `marquee` for client logos (slow, warm bg).
- 21st.dev tabs, cards, testimonial layouts.
- Custom: team rail with real photographs, paired image+paragraph blocks.

Weak fits: dark-luxe drenched darkness, brutalism poster, dashboards, gallery sparseness.

## 10. Motion profile
SI: gentle scroll fade-up (stagger 80ms), text mask reveal on display, soft hover lift (translateY -2px + tinted shadow), slow marquee.
NO: hard cuts, magnetic on every element, 3D spectacle, neon glow.
Ease: cubic-bezier(0.32, 0.72, 0, 1). Durations 400-700ms.

## 11. Copy tone
Confident, kind, exact. First person plural ("we").
Good headlines:
- "We design with the people who use the thing."
- "A small studio. Twelve years. Forty projects."
- "Quiet work that ships."

Forbidden headlines:
- "Crafted with passion"
- "We elevate brands"
- "Next-gen creative partner".

## 12. Forbidden patterns (additional to the 13 global)
- Stock photo smiling teams.
- Generic SVG profile eggs.
- Three equal feature cards under hero.
- Cool-gray neutrals (must be warm).
- AI-purple-blue accents.
- Glassmorphism.
- Centered hero.

## 13. Reference brands
- Stripe Atlas (stripe.com/atlas).
- Linear company page.
- Webflow agency pages.
- Frame.io company storytelling.
