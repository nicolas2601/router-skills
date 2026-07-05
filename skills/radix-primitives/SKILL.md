---
name: radix-primitives
description: |
  Radix UI Primitives — base headless de shadcn-ui. Components accesibles WAI-ARIA out-of-box (Dialog, Popover, Combobox, Select, Tooltip, Menu, Tabs, etc). Sin estilos, vos los aplicás. Trigger: radix, headless ui, dialog, popover, combobox, accessibility, a11y, aria.
when_to_use: |
  Necesitás Dialog/Popover/Combobox/Select sin pesar 100kb.
  Accesibilidad WCAG AA es no-negociable.
  shadcn-ui no cubre el componente que necesitás.
  Querés diseño 100% custom sobre primitives accesibles.
when_NOT_to_use: |
  shadcn-ui ya tiene el componente que necesitás (mejor usá shadcn).
  Componentes muy custom donde no necesitás keyboard nav (un div sirve).
---

# Radix UI Primitives

Headless components, accesibles, sin estilos. Base de shadcn-ui.

## Install (per-component)

```bash
pnpm add @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-tooltip
# Lista completa: https://radix-ui.com/primitives/docs/overview/getting-started
```

## Dialog

```tsx
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function MyDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="rounded-md bg-black px-4 py-2 text-white">Abrir</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <Dialog.Title className="text-xl font-bold">Título</Dialog.Title>
          <Dialog.Description className="text-sm text-gray-600">Descripción accesible</Dialog.Description>
          <div className="mt-4">{/* contenido */}</div>
          <Dialog.Close asChild>
            <button className="absolute right-3 top-3"><X size={16} /></button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

## Popover

```tsx
import * as Popover from "@radix-ui/react-popover";

<Popover.Root>
  <Popover.Trigger>Trigger</Popover.Trigger>
  <Popover.Portal>
    <Popover.Content sideOffset={8} align="start" className="rounded-md bg-white p-3 shadow-md">
      Contenido
      <Popover.Arrow className="fill-white" />
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
```

## Tooltip

```tsx
import * as Tooltip from "@radix-ui/react-tooltip";

<Tooltip.Provider delayDuration={300}>
  <Tooltip.Root>
    <Tooltip.Trigger>?</Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content className="rounded bg-black px-2 py-1 text-xs text-white">
        Tooltip text
        <Tooltip.Arrow className="fill-black" />
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
</Tooltip.Provider>
```

## Componentes disponibles

Accordion, AlertDialog, AspectRatio, Avatar, Checkbox, Collapsible, ContextMenu, Dialog, DropdownMenu, Form, HoverCard, Label, Menubar, NavigationMenu, Popover, Progress, RadioGroup, ScrollArea, Select, Separator, Slider, Switch, Tabs, Toast, Toggle, ToggleGroup, Toolbar, Tooltip.

## Patterns

### `asChild` para componer

```tsx
<Dialog.Trigger asChild>
  <Button variant="outline">Abrir</Button>
</Dialog.Trigger>
```

`asChild` evita un `<button>` extra — Radix mergea props sobre el child.

### Animations con data-state

Radix expone `data-state="open|closed"` y `data-side="top|right|bottom|left"`. Animá con CSS:

```css
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

.popover[data-state="open"] { animation: fade-in 0.15s ease; }
```

O con Tailwind + tailwindcss-animate plugin (incluido en shadcn).

## Reglas no negociables

1. **`<Portal>` siempre** para Dialog/Popover/Tooltip — escapá del overflow del padre.
2. **`<Title>` + `<Description>`** en Dialog — required para a11y (lee el screen reader).
3. **`<Close>` con `asChild`** y label accesible (`aria-label="Cerrar"`).
4. **Z-index**: Radix Portal renderiza al final del body, sin z-index issues. NO agregues `z-50` a menos que tengas otro Portal compitiendo.
5. **Animations data-state**: en vez de manejar `open` con state custom, usá `data-state` de Radix.
6. **`forwardRef` si los wrappás** — Radix los necesita para keyboard nav.

## Migración a shadcn-ui

Si vas a usar 5+ Radix primitives, mejor instalá shadcn-ui (que los wrapea con estilos).

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add dialog popover tooltip
```

## Recursos

- Docs: https://www.radix-ui.com/primitives
- Repo: https://github.com/radix-ui/primitives
- Examples: https://www.radix-ui.com/primitives/docs/overview/getting-started
- shadcn-ui (recomendado): https://ui.shadcn.com
