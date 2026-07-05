---
name: react-three-fiber
description: |
  React Three Fiber (R3F) + drei + leva. Renderer declarativo de Three.js para React. Úsalo en cualquier proyecto React que necesite 3D — hero scenes, product viewers, data viz 3D, WebXR. NO uses Three.js imperativo en proyectos React (es anti-idiomático). drei trae helpers (cameras, controls, loaders, shaders, postprocessing). Trigger: r3f, three-fiber, drei, three.js, 3d, webgl react, hero 3d.
when_to_use: |
  Hero sections con 3D en sitios React/Next.
  Product configurators (rotar, zoom, custom materials).
  Data viz 3D, particle systems, shader art.
  WebXR + R3F.
  Cualquier proyecto que combine React UI + 3D.
when_NOT_to_use: |
  Proyectos sin React (usa Three.js puro).
  Rendering 3D para web games AAA — usa Babylon/PlayCanvas.
  Mobile RN sin web (no tiene soporte directo, usa expo-three).
---

# React Three Fiber (R3F) + drei

R3F es el wrapper React idiomático de Three.js. drei son los helpers obligatorios.

## Install

```bash
pnpm add three @react-three/fiber @react-three/drei leva
pnpm add -D @types/three
```

## Boilerplate mínimo

```tsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF } from "@react-three/drei";

function Model() {
  const { scene } = useGLTF("/model.glb");
  return <primitive object={scene} />;
}

export default function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Environment preset="studio" />
      <Model />
      <OrbitControls enableZoom={false} />
    </Canvas>
  );
}
```

## Helpers de drei imprescindibles

| Helper | Uso |
|---|---|
| `<OrbitControls />` | Cámara con drag/zoom |
| `<Environment preset="..." />` | HDRi para PBR (studio, sunset, city, dawn) |
| `useGLTF` / `<Gltf />` | Cargar .glb/.gltf con suspense |
| `<MeshTransmissionMaterial />` | Glass/refraction premium |
| `<Float />` | Idle floating animation |
| `<ScrollControls />` + `<Scroll>` | Scroll-driven camera |
| `<Html />` | DOM elements posicionados en 3D |
| `<Text />` | 3D text con MSDF |
| `<Stage />` | Auto-lighting + camera |
| `<PerspectiveCamera makeDefault />` | Cámara custom controlable |
| `<EffectComposer />` (postprocessing) | Bloom, DoF, SSAO |

## Patterns

### Suspense para assets

```tsx
<Canvas>
  <Suspense fallback={null}>
    <Model />
  </Suspense>
</Canvas>
```

### Performance: dpr capeado + frameloop on-demand

```tsx
<Canvas dpr={[1, 2]} frameloop="demand" gl={{ antialias: true, powerPreference: "high-performance" }} />
```

### useFrame para animar

```tsx
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

function Spinner() {
  const ref = useRef();
  useFrame((_, delta) => { ref.current.rotation.y += delta; });
  return <mesh ref={ref}>...</mesh>;
}
```

### leva para debug GUI (dev only)

```tsx
import { useControls } from "leva";

const { intensity, color } = useControls({
  intensity: { value: 1, min: 0, max: 5 },
  color: "#ff0000",
});
```

## Reglas no negociables

1. **dpr cap a 2**: nunca `dpr={window.devicePixelRatio}` raw — mata mobile.
2. **`frameloop="demand"`** si la escena es estática — no renderear 60fps si nada cambia.
3. **GLTF/GLB siempre**: jamás .obj/.fbx en producción.
4. **Draco compression**: para modelos >1MB.
5. **Suspense + lazy**: nunca cargar el `<Canvas>` SSR en Next — `dynamic(import, { ssr: false })`.
6. **prefers-reduced-motion**: detectar y desactivar autoSpin/parallax 3D.
7. **Postprocessing**: bloom > 0.5 es kitsch, máximo 0.3.

## Anti-patrones

- ❌ Crear scene/camera/renderer manualmente — eso es Three.js puro, no R3F.
- ❌ Llamar `mesh.rotation.y = ...` fuera de `useFrame` — no triggea re-render.
- ❌ Cargar texturas dentro del componente sin `useTexture` — re-fetch infinito.

## Recursos

- Docs R3F: https://r3f.docs.pmnd.rs
- Docs drei: https://drei.docs.pmnd.rs
- Repo: https://github.com/pmndrs/react-three-fiber
- Examples: https://docs.pmnd.rs/react-three-fiber/getting-started/examples
- Migration v9: https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide
