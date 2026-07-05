---
name: motion
description: |
  Motion (motion.dev), sucesor oficial de framer-motion. 30.7k stars, vanilla JS + React. Layout animations, independent transforms, gestures, scroll-driven. Úsalo cuando el proyecto sea React/Next y necesite animaciones declarativas (variants, AnimatePresence, layout shared elements). NO uses GSAP para esto — Motion es más idiomático en React. Trigger: framer, motion, animation, transition, gesture.
when_to_use: |
  Animaciones declarativas en React/Next (variants, layout, gestures, scroll).
  AnimatePresence para enter/exit transitions.
  Shared layout animations entre rutas.
  Drag/swipe gestures en componentes.
  Reduce-motion respetado out-of-box.
when_NOT_to_use: |
  Animaciones imperativas pesadas (GSAP es mejor).
  Vanilla JS sin React (usar motion vanilla, no la version React).
  Timeline complejas multi-stage (GSAP timeline).
---

# Motion (motion.dev)

Sucesor oficial de framer-motion mantenido por motiondivision. 30.7k stars en GitHub.

## Install

```bash
pnpm add motion
# o
npm i motion
```

## Imports

```tsx
import { motion, AnimatePresence } from "motion/react";
import { useScroll, useTransform } from "motion/react";
```

## Patterns esenciales

### 1. Variants (mejor que props inline)

```tsx
const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

<motion.div variants={variants} initial="hidden" animate="visible" />
```

### 2. AnimatePresence (enter/exit)

```tsx
<AnimatePresence mode="wait">
  {open && (
    <motion.div
      key="modal"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    />
  )}
</AnimatePresence>
```

### 3. Layout animations (FLIP gratis)

```tsx
<motion.div layout layoutId="card-1" />  {/* shared element entre rutas */}
```

### 4. Scroll-driven

```tsx
const { scrollYProgress } = useScroll();
const y = useTransform(scrollYProgress, [0, 1], [0, -200]);
<motion.div style={{ y }} />
```

### 5. Gestures

```tsx
<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} drag dragConstraints={{ left: 0, right: 100 }} />
```

## Reglas no negociables

1. **Easing**: usa cubic-bezier custom `[0.22, 1, 0.36, 1]` (out expo) en vez del default. Nunca `bounce`/`elastic` salvo intención clara.
2. **Duration**: 0.2-0.4s para micro, 0.5-0.7s para layout. Nunca >1s salvo intro.
3. **`prefers-reduced-motion`**: respetado automático, pero si haces variants custom, usa `useReducedMotion()` hook.
4. **`will-change` automático**: Motion lo gestiona, NO lo agregues manual.
5. **Layout animations**: solo en elementos que CAMBIAN de tamaño/posición. NO abuses.
6. **AnimatePresence**: siempre con `key` único en el child.

## Anti-patrones

- ❌ Animar `width`/`height` directamente — usa `scale` + `layout`.
- ❌ `transition: { type: 'spring' }` por default — `bounce` se siente cheap. Usa tweens.
- ❌ Animar 50+ elementos a la vez sin stagger.

## Cheat sheet de durations + easings

| Caso | Duration | Easing |
|---|---|---|
| Hover | 0.2s | `easeOut` |
| Page enter | 0.6s | `[0.22, 1, 0.36, 1]` |
| Modal open | 0.3s | `easeOut` |
| Layout shift | 0.4s | `easeInOut` |

## Recursos

- Docs: https://motion.dev
- Repo: https://github.com/motiondivision/motion
- Examples: https://examples.motion.dev
