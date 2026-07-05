---
name: million-view-transitions
description: |
  Million.js (compiler que hace React 70% más rápido vía VDOM diff optimizer) + View Transitions API nativa (smooth page transitions sin lib). Trigger: million, performance, vdom, view-transitions, page transition, smooth nav, react perf.
when_to_use: |
  Apps React con re-renders heavy y bottleneck identificado.
  Tablas/listas grandes (>100 rows visibles).
  Sites multi-página que necesitan transiciones smooth (sin SPA).
  Lighthouse Performance < 90 con render-bound profile.
when_NOT_to_use: |
  Apps que ya corren a 60fps cómodos (no over-engineer).
  Server Components-only (Million es client-side).
  Apps con re-renders dominados por network, no por VDOM.
---

# Million.js + View Transitions API

## Million.js — compiler React perf

Reemplaza el VDOM diff de React por un block VDOM que es 70% más rápido en hot paths.

### Install

```bash
pnpm add million
```

### Setup Vite/Next

```js
// vite.config.ts
import million from "million/compiler";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [million.vite({ auto: true }), react()],
});
```

```js
// next.config.js
const million = require("million/compiler");

module.exports = million.next({
  auto: true,  // auto-optimiza componentes detectados
  rsc: true,   // Server Components compatible
});
```

### Modo manual (granular)

```tsx
import { block } from "million/react";

const FastTable = block(function Table({ rows }) {
  return <table>...</table>;
});
```

### Cuándo `auto: true` no aplica

- Componentes con `useEffect` heavy → no se optimizan.
- Componentes con context dynamic → no se optimizan.
- Solo aplica a componentes "puros" con props → render.

### Verificar gains

```bash
# Antes
pnpm dev
# Profile en React DevTools → ver "render time" por componente
# Después de million:
# Misma profile, comparar.
```

Reportes típicos: 30-70% reduction en render time de tablas/listas. NO ayuda en componentes simples.

## View Transitions API (browser nativo)

Smooth page transitions sin lib. Soporte: Chrome 111+, Edge, Safari 18+. Firefox falta (gracefully degrades).

### Multi-page (MPA — Astro, Next App Router)

```html
<!-- Habilitar en <head> -->
<meta name="view-transition" content="same-origin" />
```

En Astro:

```astro
---
import { ViewTransitions } from "astro:transitions";
---
<head>
  <ViewTransitions />
</head>
```

### SPA (React/Next con `useTransition`)

```tsx
import { unstable_ViewTransition as ViewTransition } from "react";

<ViewTransition>
  <div className="card">{content}</div>
</ViewTransition>
```

O imperativo:

```ts
function navigate(href: string) {
  if (!document.startViewTransition) {
    location.href = href;
    return;
  }
  document.startViewTransition(() => {
    location.href = href;
  });
}
```

### Custom transitions con CSS

```css
::view-transition-old(root) {
  animation: fade-out 0.3s ease forwards;
}
::view-transition-new(root) {
  animation: fade-in 0.3s ease forwards;
}

@keyframes fade-out { to { opacity: 0; } }
@keyframes fade-in { from { opacity: 0; } }
```

### Shared elements (FLIP automático)

```css
.hero-image {
  view-transition-name: hero;  /* mismo name en ambas pages = shared transition */
}
```

## Reglas no negociables

1. **Million NO es silver bullet** — profileá ANTES y DESPUÉS. Si el bottleneck es network, Million no ayuda.
2. **`auto: true`** primero — solo bajar a `block()` manual si necesitás más control.
3. **View Transitions: `same-origin` only** — cross-origin no funciona por seguridad.
4. **Fallback gracefully**: `if (!document.startViewTransition) { ... }` — Firefox aún no soporta.
5. **`prefers-reduced-motion`**: respetar con CSS:
   ```css
   @media (prefers-reduced-motion: reduce) {
     ::view-transition-old(root), ::view-transition-new(root) { animation: none; }
   }
   ```
6. **Naming `view-transition-name`** único por elemento — duplicados crashean la transition.

## Anti-patrones

- ❌ Million en TODO sin profileár — puede degradar perf en componentes pequeños.
- ❌ View Transitions con `<a>` que abre new tab — no funciona.
- ❌ Animar 50+ shared elements — el browser no escala bien.

## Recursos

- Million: https://million.dev
- Million repo: https://github.com/aidenybai/million
- View Transitions API: https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
- Astro ViewTransitions: https://docs.astro.build/en/guides/view-transitions/
- React experimental: https://react.dev/reference/react/ViewTransition
