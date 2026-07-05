# WOW v2 — Variety Modes (Anti-Loop Protocol)

> Loaded by `wow-archetype-selector` and `wow-iteration-coordinator`.
> Goal: make two consecutive runs of the same project produce visibly different builds, and stop the model from drifting into one "favorite" template.

---

## 1. VARIETY PENALTY

### 1.1 Formula (SINGLE SOURCE OF TRUTH)

This is THE formula for `variety_penalty`. Other files (`wow-archetype-selector.md`, etc.) must reference this — never duplicate.

```ts
variety_penalty(archetype, history) =
  0.30 * count_in_last_5(history, archetype)
+ 0.60 * (last_build_archetype == archetype ? 1 : 0)
+ 0.20 * count_same_recipe_combo(history, archetype, current_recipe_seed)
```

**FIFO note**: `history.jsonl` is append-only. "Last 5" is applied AT READ TIME by tailing the last 5 lines:

```bash
tail -n 5 ~/.claude/.wow-state/history.jsonl
```

The file is NOT auto-rotated. To prevent unbounded growth, the orchestrator MAY truncate occasionally:

```bash
# Keep only the last 200 entries to bound file size
tail -n 200 ~/.claude/.wow-state/history.jsonl > "$_tmp" && mv "$_tmp" ~/.claude/.wow-state/history.jsonl
```

Do this lazily (e.g., when `wc -l history.jsonl` returns > 500), not on every build.

- `count_in_last_5`: how many of the last 5 builds used this archetype.
- `last_build_archetype == archetype`: hard penalty for immediate repeat.
- `count_same_recipe_combo`: penalize if the same archetype × recipe-permutation appears in last 5.

### 1.2 Penalty bands → action

| Penalty | Selector action |
|---|---|
| `< 0.30` | archetype freely eligible |
| `0.30 – 0.59` | archetype eligible only if top-3 by fit_score after penalty subtraction |
| `0.60 – 0.89` | archetype only eligible if user explicitly pinned with `--pin-archetype` |
| `≥ 0.90` | archetype hard-banned for this build; selector skips it |

### 1.3 Pool construction

```ts
function buildArchetypePool(brief, history) {
  const all = ALL_ARCHETYPES
  const scored = all.map(a => ({
    archetype: a,
    score: fit_score(brief, a) - variety_penalty(a, history)
  }))
  scored.sort((x, y) => y.score - x.score)
  // pool of 3 candidates with positive net score
  return scored.filter(s => s.score > 0).slice(0, 3)
}
```

Then the selector rolls `seed_byte_0` against the pool to pick one of the three. This guarantees that the selector is NOT deterministic by brief alone — the seed introduces real variance even when fit_scores are close.

---

## 2. DIAL JITTER ±2

### 2.1 Pseudo-code

```ts
function jitterDial(baseline: number, seedHex: string, dialName: 'DV'|'MI'|'VD'): number {
  // each dial gets its own byte: DV=byte8, MI=byte9, VD=byte10
  const byteIndex = { DV: 8, MI: 9, VD: 10 }[dialName]
  const byte = parseInt(seedHex.slice(byteIndex * 2, byteIndex * 2 + 2), 16)
  // map 0-255 → -2..+2 (5 bands)
  const offsetTable = [-2, -1, 0, 1, 2]
  const offset = offsetTable[Math.floor(byte / 51)] // 256/5 ≈ 51
  return Math.min(10, Math.max(1, baseline + offset))
}
```

### 2.2 Examples

For `editorial-premium` baseline (DV:5 / MI:2 / VD:4) and seed bytes `…a1 4f c8`:

- `0xa1` (161) → table index 161/51 = 3 → offset +1 → DV = 6
- `0x4f` (79)  → table index 79/51 = 1 → offset -1 → MI = 1 (clamped)
- `0xc8` (200) → table index 200/51 = 3 → offset +1 → VD = 5

Resulting dials: DV:6 MI:1 VD:5. Still readable as editorial-premium but with extra structural risk and tighter density.

### 2.3 Override

If user provides explicit dials in the invocation, jitter is SKIPPED for those dials. If user provides only some (e.g., `MI=8`), the other dials still jitter from their baseline.

---

## 3. ARCHETYPE SELECTOR — POOL OF 3

### 3.1 Pseudo-flow

```
1. Parse brief → extract signals (product_type, mood, audience, voice, density_hint)
2. For each of 14 archetypes:
     fit_score = sum(signal_match_weights)
3. Subtract variety_penalty from each fit_score
4. Sort descending by net score
5. Take top 3 with net score > 0 → POOL
6. If POOL is empty (very rare):
     fall back to top 3 by raw fit_score (variety penalty ignored)
7. Use seed_byte_0 mod 3 to pick from POOL
8. If picked archetype has hard-ban penalty (≥0.90), shift to POOL[1]
```

### 3.2 Pool diversity rule

If POOL has 3 archetypes from the same family (e.g., `quiet-luxury`, `editorial-premium`, `warm-modern` — all calm-warm), the selector swaps POOL[2] for the highest-scoring archetype from a DIFFERENT family. Families:

- **Cultural / loud**: brutalism, soft-brutalism, cinematic-product
- **Calm / warm**: quiet-luxury, soft, warm-modern, editorial-premium
- **Systems / strict**: swiss-system, dashboards, monochrome-modern, minimalism, gallery-minimal
- **Product / dense**: premium-bento, dashboards, cinematic-product
- **Mood / dark**: dark-luxe, cinematic-product

This forces the pool to span at least 2 families when possible.

---

## 4. ITERATION-COORDINATOR — "YOU DID THE SAME THING" DETECTION

### 4.1 Trigger phrases (regex per language)

```ts
const SAME_THING_PHRASES = [
  /you (keep|did|are) doing the same thing/i,
  /this is the same as last time/i,
  /no real change/i,
  /esto es lo mismo/i,
  /es lo mismo que la vez pasada/i,
  /no veo diferencia/i,
  /es el mismo (template|estilo)/i,
  /haz algo (distinto|diferente|nuevo)/i,
  /try something different/i,
  /fresh take/i,
  /totally different/i,
]
```

If any matches the user's iteration prompt → switch to `archetype-shift` mode.

### 4.2 archetype-shift action sequence

1. Append `+0.60` to `variety_penalty(currentArchetype)` for this build.
2. Set `dial_jitter_range` from ±2 to ±3 (clamped 1–10).
3. Re-roll seed with `counter += 1`.
4. Re-build POOL with the boosted penalty.
5. Force selector to pick from POOL[1] (NOT POOL[0]) — even if POOL[0] is now a different archetype, skip it to guarantee maximum distance.
6. Force a different recipe permutation: the new seed's `byte_0..byte_5` MUST differ from previous build's at minimum 4 of 6 positions. If not, increment the appropriate bytes.
7. Write `CHANGELOG.md` entry explaining the shift with the previous archetype + new archetype + why.

---

## 5. ANTI-LOOP CIRCUIT BREAKERS

Hard rules that cannot be overridden by seed alone:

1. **No archetype 2 builds in a row** unless `--pin-archetype` is explicit.
2. **No hero composition repeat** in 3 consecutive builds (composition = archetype + hero variant). If POOL produces a repeat, force variant +1 (mod variant_count).
3. **No recipe permutation repeat** in 5 consecutive builds. The 6-byte recipe vector must differ in at least 3 positions vs. any of the last 5.
4. **No copy direction repeat**: the brief parser tags each build with a copy register (`declarative`, `editorial`, `operational`, `warm`, `technical`, `sensual`). Two consecutive same-register builds → force copy-direction shift by alternating the register byte.
5. **Palette index repeat cap**: across 5 consecutive builds of the same archetype, the palette index (0|1|2) must visit all three at least once before repeating.
6. **Motion profile repeat cap**: if the last 3 builds all used scroll-pinning, the next build is barred from MI≥8 even if archetype baseline allows it (until 1 build passes without pin).
7. **User explicit override**: if the user pins everything (`--pin-archetype --pin-dials --pin-palette`), all anti-loop rules suspend — user wins.

---

## 6. PREVENTING REPEAT — CHECKLIST USED BY SELECTOR

Before finalizing the archetype + recipe vector + dials, the selector checks:

- [ ] Archetype differs from last build (unless `--pin-archetype`)
- [ ] Hero variant differs from last 3 builds with same archetype
- [ ] Recipe 6-byte vector differs from last 5 in ≥3 positions
- [ ] Copy direction differs from last build
- [ ] Palette index has rotated within last 5 same-archetype builds
- [ ] Motion profile (MI band 1-3 | 4-7 | 8-10) differs from last build if possible
- [ ] DV jitter applied (unless user pinned DV)

If 2+ checks fail, the selector re-rolls seed (`counter += 1`) up to 3 times. If still failing after 3 re-rolls, surface a warning to the orchestrator: "Variety constraints exhausted — building anyway with closest acceptable permutation."

---

## 7. HISTORY FILE FORMAT

`~/.claude/.wow-state/history.jsonl` — one line per build:

```json
{
  "ts": "2026-05-19T11:05:09Z",
  "project": "/Documentos/JULIAN/web",
  "seed": "a1f2b3c4d5e6f708",
  "archetype": "editorial-premium",
  "dials": { "DV": 6, "MI": 1, "VD": 5 },
  "recipe_vector": [2, 0, 2, 1, 0, 1],
  "palette_index": 2,
  "copy_register": "editorial",
  "motion_profile_band": "1-3",
  "audit": "PASS",
  "iteration_of": null
}
```

`iteration_of` points to the previous build's `seed` if this is an iteration mode build. Used to construct iteration chains.

---

## 8. VARIETY DEBUG OUTPUT

When `WOW_DEBUG=1`, the selector writes `/tmp/wow-variety-trace-<seed>.txt` with the full scoring matrix, pool construction steps, jitter calculations, and circuit breaker hits. This file is the auditor's trail for "why was archetype X picked over Y" questions.
