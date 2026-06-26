---
name: unicorn-studio
description: Embeds WebGL animados de Unicorn Studio (no-code WebGL tool). Hero sections cinematic con efectos de fluido/partículas/displacement. Para landings premium que necesitan un "wow" visual sin escribir GLSL. Drop-in vía CDN script tag.
type: integration
source: https://www.unicorn.studio
when_to_use: hero section que necesita motion fluido + interactivo (mouse-react), cuando el goal es "wow visual" sin invertir días en three.js / shader custom; mantenés Next.js / Astro / vanilla
---

# Unicorn Studio — WebGL Embeds para Landings

Unicorn Studio es una herramienta no-code que produce escenas WebGL exportables como embed. Ideal para hero sections cinematográficos en landings premium.

## Instalación (proyecto Next.js / Astro / cualquier framework)

### 1. Diseñá la escena en unicorn.studio
Hacé el remix en https://www.unicorn.studio (cuenta gratis disponible). Cuando estés feliz → **Export** → te da un `projectId`.

### 2. Cargá el script en tu HTML

```html
<!-- En <head> o antes del cierre de </body> -->
<script type="text/javascript" src="https://cdn.unicorn.studio/v1.5.0/unicornStudio.umd.js"></script>
<script>
  if (!window.UnicornStudio) {
    window.UnicornStudio = { isInitialized: false };
  }
  window.UnicornStudio.init();
</script>
```

### 3. Insertá el embed donde lo querés

```html
<div data-us-project="YOUR_PROJECT_ID" style="width:1440px; height:900px;"></div>
```

### En Next.js 15 (App Router)

```tsx
// app/components/UnicornHero.tsx
'use client';
import Script from 'next/script';

export function UnicornHero({ projectId }: { projectId: string }) {
  return (
    <>
      <Script
        src="https://cdn.unicorn.studio/v1.5.0/unicornStudio.umd.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (!(window as any).UnicornStudio?.isInitialized) {
            (window as any).UnicornStudio = (window as any).UnicornStudio || {};
            (window as any).UnicornStudio.init?.();
          }
        }}
      />
      <div
        data-us-project={projectId}
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
        aria-hidden="true"
      />
    </>
  );
}
```

## Cuándo invocar esta skill

Triggers naturales:
- "hero cinematográfico", "hero con WebGL", "background animado"
- "fluid simulation", "shader effect", "displacement", "noise field"
- "como linear.app pero con motion", "como vercel.com hero"

## Reglas de uso premium

1. **`pointer-events-none`** en el embed cuando es decorativo — los clicks pasan al contenido encima.
2. **`aria-hidden="true"`** — es decoración pura, no info para screen readers.
3. **`-z-10`** o equivalente — siempre detrás del contenido textual.
4. **Respetá `prefers-reduced-motion`**: cargá una imagen estática como fallback.

```tsx
const prefersReducedMotion = useReducedMotion();
return prefersReducedMotion
  ? <Image src="/hero-static.webp" alt="" priority />
  : <UnicornHero projectId="..." />;
```

5. **Performance**: el embed pesa ~150KB (script) + escena (variable). Mantenelo en hero ÚNICO. NO pongas 3 embeds por página.
6. **LCP**: si es el LCP element, fallback a imagen estática para mobile (<768px) — los devices low-end tienen jank notable con WebGL fluido.

## Alternativas si Unicorn Studio NO encaja

| Necesidad | Alternativa |
|-----------|-------------|
| 3D modelos custom | three.js + react-three-fiber |
| Shader personalizado | GLSL con `Skill("shader-dev")` (de MiniMax-AI) |
| Particles light-weight | tsparticles |
| GIF/video loop simple | `<video autoplay loop muted playsinline>` |

## Pricing

Free tier permite embeds personales. Comercial necesita plan paid (~$15/mes). Verificá en https://www.unicorn.studio/pricing antes de shipear comercial.
