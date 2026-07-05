---
name: lottie-rive
description: |
  lottie-react + @rive-app/react-canvas. Animaciones JSON (Lottie) y interactivas (Rive) para hero sections, illustrations, micro-interactions premium. Más livianas que video, escalan vector. Trigger: lottie, rive, animation json, illustration, after effects, hero animation, micro-interaction.
when_to_use: |
  Hero illustrations animadas (replace video con vectorial).
  Micro-interactions complejas (loaders, success states, onboarding).
  Animations que vienen de After Effects (export como Lottie JSON).
  Animations interactivas con state machines (Rive).
when_NOT_to_use: |
  Animations triviales (CSS transition basta).
  3D real (R3F).
  Animations React puras (Motion/GSAP).
---

# Lottie + Rive

## Lottie (animations exportadas de After Effects)

### Install

```bash
pnpm add lottie-react
```

### Uso básico

```tsx
import Lottie from "lottie-react";
import animationData from "./hero-animation.json";

export function Hero() {
  return (
    <Lottie
      animationData={animationData}
      loop
      autoplay
      style={{ width: 400, height: 400 }}
    />
  );
}
```

### Control programático

```tsx
import { useRef } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";

const ref = useRef<LottieRefCurrentProps>(null);

<Lottie lottieRef={ref} animationData={data} autoplay={false} />
<button onClick={() => ref.current?.play()}>Play</button>
<button onClick={() => ref.current?.pause()}>Pause</button>
<button onClick={() => ref.current?.setSpeed(2)}>2x</button>
```

### Lazy load (perf)

```tsx
import dynamic from "next/dynamic";
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
```

### Optimizaciones

- Usá [LottieFiles compressor](https://lottiefiles.com/tools/json-editor) — reduce 50-80% tamaño.
- Cap a 60fps en export.
- Usá `dotLottie` (.lottie) format si está disponible — gzip-friendly.

```bash
pnpm add @lottiefiles/dotlottie-react
```

```tsx
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

<DotLottieReact src="/animation.lottie" loop autoplay />
```

## Rive (animations interactivas con state machines)

Rive permite state machines en la animation — interactividad real (hover, click, scroll → state).

### Install

```bash
pnpm add @rive-app/react-canvas
```

### Uso básico

```tsx
import { useRive } from "@rive-app/react-canvas";

export function Button() {
  const { rive, RiveComponent } = useRive({
    src: "/button.riv",
    stateMachines: "ButtonStateMachine",
    autoplay: true,
  });

  return (
    <RiveComponent
      style={{ width: 200, height: 60 }}
      onMouseEnter={() => rive?.play("hover")}
      onMouseLeave={() => rive?.play("idle")}
    />
  );
}
```

### State machine inputs

```tsx
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";

const { rive, RiveComponent } = useRive({
  src: "/onboarding.riv",
  stateMachines: "Main",
  autoplay: true,
});

const stepInput = useStateMachineInput(rive, "Main", "step");

// Cambiar step desde React:
useEffect(() => { if (stepInput) stepInput.value = currentStep; }, [currentStep]);
```

### Cuándo Rive vs Lottie

| Caso | Usá |
|---|---|
| Animation linear sin interacción | Lottie |
| Hover/click/state changes | Rive |
| Animation viene de After Effects | Lottie (export con bodymovin) |
| Animation viene de Figma/diseño custom | Rive (designer-friendly) |
| Loaders | Lottie |
| Onboarding interactivo | Rive |

## Reglas no negociables

1. **`ssr: false`** en Next — Lottie/Rive no SSR.
2. **`width`/`height` explícitos** — sin esto layout shift (CLS).
3. **`prefers-reduced-motion`**: respetá con guard:
   ```tsx
   const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
   if (reduced) return <img src="/static-fallback.svg" />;
   ```
4. **Lazy load** below-fold animations con `IntersectionObserver` o `client:visible` (Astro).
5. **Tamaño**: Lottie >500kb es smell — comprimir o usar Rive.
6. **Fallback estático**: si JS falla, mostrá SVG/PNG.

## Anti-patrones

- ❌ 5+ Lottie autoplay en una página — devora batería mobile.
- ❌ Lottie con 100+ layers — pesado, usá Rive o video.
- ❌ Sin `loop={false}` cuando es one-shot — molesta al usuario.

## Recursos

- LottieFiles: https://lottiefiles.com (gratis library de animations)
- lottie-react: https://github.com/Gamote/lottie-react
- dotLottie: https://github.com/LottieFiles/dotlottie-web
- Rive: https://rive.app
- Rive React: https://github.com/rive-app/rive-react
- Rive examples: https://rive.app/community/files
