---
name: minimax-2-step-frontend
description: |
  REFERENCIA OPCIONAL — workflow 2-pasos manual para frontend ultra-premium (Awwwards-grade). El flow DEFAULT del kit ya es 100% automático con los hooks `minimax-frontend-prefix.sh` (inyecta reglas pre-generación) + `minimax-frontend-validator.sh` (rechaza post-generación si falla, M2 se auto-corrige). Este 2-step solo se invoca si el cliente exige calidad pixel-perfect que ni M2 con auto-corrección logra. Trigger: workflow 2-step frontend, awwwards-grade, cliente paga calidad pixel-perfect.
when_to_use: |
  SOLO cuando el flow automatico (prefix + validator + auto-corrección) ya intentó 3+ rounds y aún falla a juicio del cliente. NO es el default.
  Awwwards-grade landings para clientes que pagan extra por pulido.
  Cuando hay budget para 2× turns y tiempo para revisión humana.
when_NOT_to_use: |
  Default: NO usar. El kit v3.7+ es automático, M2 se auto-corrige con el validator.
  MVPs internos.
  Cualquier proyecto donde "funcional + auto-corrected" sea suficiente.
---

# Workflow 2-pasos: M2.7 estructura → Claude pule (referencia opcional)

> NOTA v3.7: el kit ahora tiene flow automatico via 2 hooks nuevos:
> - `minimax-frontend-prefix.sh` (UserPromptSubmit) — inyecta las 7 reglas ANTES de generar
> - `minimax-frontend-validator.sh` (PostToolUse Write|Edit) — rechaza output que falla, M2 lee feedback y se auto-corrige en próximo turn
>
> Este 2-step es REFERENCIA solo para casos extremos donde el cliente paga por pulido manual.

## Por qué existe

E2E test del kit con M2.7 (v3.6.1) revelo:
- M2.7 RESPETA reglas explícitas en prompt (no Inter, no bounce, no emojis cuando se le pide).
- M2.7 IGNORA reglas profundas del CLAUDE.md global cuando el output es largo:
  - 0 instancias de `prefers-reduced-motion`
  - 0 CSS variables (todo hex hardcoded)
  - 0 `clamp()` (uso `text-7xl` Tailwind)
  - 10x `items-center justify-center` en hero (anti-asymmetric)

Para clientes premium esto es deal-breaker. Solucion: 2-step.

## El workflow

### Paso 1 — M2.7 genera estructura + contenido

```bash
# Setup: claude con MiniMax
ANTHROPIC_BASE_URL="https://api.minimax.io/anthropic" \
ANTHROPIC_API_KEY="$MINIMAX_API_KEY" \
ANTHROPIC_MODEL="MiniMax-M2.7" \
claude -p "Crea landing premium para [cliente]. Stack: Next 15 + Tailwind + Motion + R3F. Secciones: hero + features (3) + pricing (3 tiers) + testimonials + footer. Foco: estructura HTML semantica + contenido (copy real, no lorem) + Tailwind classes basicas. NO te preocupes por animations finas ni CSS vars todavia." \
  --max-turns 25 \
  --permission-mode acceptEdits
```

**Output esperado**: archivos funcionales con estructura correcta, copy decente, layout aproximado. ~3min, ~$0.10-0.20.

### Paso 2 — Claude Sonnet/Opus pule UI fina

```bash
# Setup: claude con Anthropic (default API key)
unset ANTHROPIC_BASE_URL ANTHROPIC_MODEL
# (o usa profile vanilla: claude --profile vanilla)
claude -p "Pule la UI de los archivos en \$PWD aplicando las 7 reglas no-negociables: clamp() para tipo, CSS vars para tokens, prefers-reduced-motion, asymmetric hero (grid 12 cols), 3+ capas bg, NO Inter, NO bounce. Tambien: micro-interacciones con Motion, hover states refinados, dark mode con override prefers-color-scheme. NO cambies estructura ni copy." \
  --max-turns 15 \
  --permission-mode acceptEdits
```

**Output esperado**: archivos con calidad visual pixel-perfect. ~5min, ~$0.30-0.60.

### Total: 2 turns, ~8min, ~$0.50-0.80

vs:
- M2.7 solo: $0.20 pero requiere 3-5 retries con feedback manual = ~$0.60 + tiempo
- Sonnet solo: $1.50-3.00 pero overkill para estructura simple

## Cuando saltar el paso 2

Saltar Sonnet si:
- Cliente OK con "funcional 80%" (MVP, demo interno).
- El kit ya tiene component library establecida (shadcn copy-paste).
- Plan PLUS de MiniMax tiene cuota fresca y Claude budget cero.

## Variantes

### 2-step con sub-agents (paralelo dentro del mismo claude)

```bash
# Lanza un sub-agent Sonnet desde dentro de claude+MiniMax:
# (NO funciona directo - claude usa el provider del session, no per-agent)
# Pero podes hacer pipeline manual:

# Step 1: M2 genera
M2_DIR=/tmp/draft-$(date +%s)
mkdir -p $M2_DIR && cd $M2_DIR
ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic \
  claude -p "..." --max-turns 25

# Step 2: copia a Claude (Anthropic)
cd $M2_DIR
unset ANTHROPIC_BASE_URL
claude -p "Aplica las 7 reglas anti-slop a estos archivos..." \
  --add-dir $M2_DIR --max-turns 15
```

### 2-step con MCP magic (21st.dev) en el medio

```bash
# Paso 1: M2 genera estructura
# Paso 1.5: invoca tool `21st_magic_component_builder` para hero/pricing especificos
# Paso 2: Sonnet integra los Magic components al layout y pule
```

Esto es ideal para landings de Awwwards-grade.

## Reglas no negociables del workflow

1. **Paso 1 NO se reporta al cliente** — siempre va paso 2 antes.
2. **Paso 2 NO toca estructura ni copy** — solo CSS, animations, micro-interacciones.
3. **Paso 2 con Sonnet o Opus** — Haiku no rinde en visual fine-tuning.
4. **Validator hook** (`minimax-frontend-validator.sh` v1.0.0+) corre en ambos pasos — captura violaciones residuales.
5. **Cost tracking**: log ambos turns con `cost-tracker.sh` para reportar al cliente.

## Anti-patrones

- Saltar paso 1 (Claude solo) cuando M2.7 lo haria igual de bien por 1/5 del costo.
- Saltar paso 2 (M2.7 solo) cuando cliente paga por calidad visual.
- Usar Haiku en paso 2 — no rinde en pulir hero/animations.
- Generar todo en 1 turn de Sonnet de 30 max-turns — degrada por context bloat.
- NO commitear el estado del paso 1 antes del paso 2 — perdes la version comparable.

## Recursos

- Test E2E v3.6.1: `/tmp/test-landing-v36c-1777254475/` (M2.7 solo, 32KB landing)
- CLAUDE.md global del kit, seccion "REGLAS NO-NEGOCIABLES" (linea 14+)
- Hook `minimax-frontend-validator.sh` para gate post-write
- Skill `magic-mcp-21st` para componentes premium NL-driven
