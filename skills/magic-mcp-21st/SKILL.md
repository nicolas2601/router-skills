---
name: magic-mcp-21st
description: |
  21st.dev Magic MCP — genera componentes premium desde lenguaje natural via MCP tool. Anti-UI-genérica de IA. Si Claude Code está spawneado con MCP server "magic" registrado, usá el tool `21st_magic_component_builder` antes de escribir un componente desde cero. Trigger: 21st, magic-ui, premium component, anti-generic, hero, landing premium.
when_to_use: |
  Necesitás un componente premium (hero, pricing, testimonials, features grid, dashboard cards).
  El cliente pide "que no se vea genérico/AI".
  Tenés la MCP "magic" configurada (verificar con /mcp en Claude Code).
when_NOT_to_use: |
  Componentes triviales (button, input) — usá shadcn-ui directo.
  Sin la MCP configurada — usá taste-skill o impeccable + escribir manual.
  Backend o lógica — esto es solo UI.
---

# 21st.dev Magic MCP

MCP server que genera componentes UI premium en respuesta a NL en agentes (Claude Code, Cursor, Windsurf).

## Install (una vez por máquina)

```bash
# Con API key de 21st.dev (gratis tier)
npx @21st-dev/cli@latest install claude --api-key <tu-key>
# O manual en ~/.claude/settings.json:
```

```json
{
  "mcpServers": {
    "magic": {
      "command": "npx",
      "args": ["-y", "@21st-dev/magic@latest"],
      "env": { "TWENTY_FIRST_API_KEY": "tu-key" }
    }
  }
}
```

Restart Claude Code (`/mcp` debe listar `magic` con status `connected`).

## Tools expuestos

| Tool | Uso |
|---|---|
| `21st_magic_component_builder` | Genera componente desde NL prompt + retorna código + path |
| `21st_magic_component_inspiration` | Devuelve referencias visuales para inspirar |
| `21st_magic_component_refiner` | Refina un componente existente con feedback |

## Workflow recomendado

### 1. Antes de escribir un hero/landing/pricing manual

```
Llama tool: 21st_magic_component_builder
Args: {
  searchQuery: "premium pricing section with toggle monthly/yearly",
  message: "context del proyecto",
  absolutePathToCurrentFile: "/path/to/Pricing.tsx",
  absolutePathToProjectDirectory: "/path/to/project",
  standaloneRequestQuery: "pricing 3 tiers, glass morphism, dark mode, animation on hover"
}
```

### 2. Resultado

Magic devuelve:
- Componente React+Tailwind listo para pegar
- Dependencies a instalar (motion, lucide-react, etc.)
- Variants/props sugeridos
- Path donde guardarlo

### 3. Refina si hace falta

```
Llama tool: 21st_magic_component_refiner
Args: { feedback: "más minimal, menos glassmorphism, agregar dark/light toggle" }
```

## Reglas de uso

1. **Siempre prefiere Magic MCP a escribir un hero/landing/dashboard desde cero** — la diferencia con UI genérica es brutal.
2. **Combina con shadcn-ui**: Magic genera el componente macro, shadcn provee primitives (Button, Dialog).
3. **Dark mode obligatorio**: pedilo en el prompt explícitamente o el componente vendrá light-only.
4. **Mobile-first**: pedí "responsive, mobile breakpoint X". Magic suele asumir desktop.
5. **No olvides accessibility**: pedí "WCAG AA, keyboard nav, ARIA labels".

## Verificar disponibilidad

```bash
# En Claude Code:
/mcp
# Si "magic" aparece como connected, tools disponibles.
# Si NO aparece, fallback a taste-skill + escribir manual.
```

## Pricing 21st.dev

- Free: 5 generations/día
- Pro: $20/mes ilimitado
- API key: https://21st.dev/magic/console

## Recursos

- Docs: https://21st.dev/magic
- Repo: https://github.com/21st-dev/magic-mcp
- Setup Claude Code: https://mcp.harishgarg.com/use/21stdev-magic/mcp-server/with/claude-code
