# WOW v2 — 3D / WebGL Recipes

> Loaded by `wow-3d-specialist` when `MI >= 7` and the archetype supports 3D.
> Eligible archetypes: cinematic-product (MI:8), premium-bento (MI:6 — only for one tile), brutalism (MI:2 — only if user explicitly bumps to 7+), dark-luxe (MI:6), editorial-premium (MI:2 — only as quiet background), monochrome-modern (MI:4 — only as B&W shader).
> Forbidden 3D archetypes: dashboards, swiss-system, gallery-minimal, minimalism, quiet-luxury, soft, soft-brutalism (use 2D motion instead), warm-modern (use 2D parallax instead).

All recipes assume `three@^0.168 + @react-three/fiber@^9 + @react-three/drei@^9 + @react-three/postprocessing@^3` from the canonical stack.

---

## 1. CINEMATIC-PRODUCT — Image-Sequence Hero with Bloom

### Concept
Pinned hero canvas. As the user scrolls through the first 100vh, an array of pre-rendered product frames is swapped (image sequence). Bloom postprocessing pulses with scroll intensity. Title appears at 60% scroll progress via mask reveal.

### Skeleton (TSX)

```tsx
'use client'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useScroll, ScrollControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'

const FRAME_COUNT = 120
const frameUrls = Array.from({ length: FRAME_COUNT },
  (_, i) => `/sequence/product-${String(i).padStart(3, '0')}.webp`)

// ⚠ Load 120 textures lazily under Suspense. Loading 120 textures eagerly on mount
// freezes the main thread for ~3-8s on mid-range devices.

function useFrameTextures(urls: string[]) {
  // useLoader from @react-three/fiber suspends until all textures are loaded.
  // Combined with <Suspense> in the parent, gives a clean aesthetic skeleton.
  return useLoader(THREE.TextureLoader, urls)
}

function SequencePlane({ frameUrls }: { frameUrls: string[] }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const scroll = useScroll()
  const textures = useFrameTextures(frameUrls)  // suspends; parent Suspense catches it

  useFrame(() => {
    const progress = scroll.offset
    const idx = Math.min(textures.length - 1, Math.floor(progress * textures.length))
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    if (mat.map !== textures[idx]) {
      mat.map = textures[idx]
      mat.needsUpdate = true
    }
  })
  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[16, 9]} />
      {/* CRITICAL: provide map={textures[0]} on initial render — without it the first
          frame is white until useFrame runs, causing a visible flicker. */}
      <meshBasicMaterial map={textures[0]} toneMapped={false} />
    </mesh>
  )
}

export function CinematicHero() {
  return (
    <section className="relative min-h-[100dvh]">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 8], fov: 28 }}>
        <ScrollControls pages={1} damping={0.3}>
          <SequencePlane />
        </ScrollControls>
        <EffectComposer>
          <Bloom intensity={0.6} luminanceThreshold={0.4} luminanceSmoothing={0.9} />
        </EffectComposer>
      </Canvas>
    </section>
  )
}
```

### Perf budget
- Triangles: < 4 (one plane).
- Draw calls: < 5 (plane + postprocessing).
- Textures: 120 webp @ ~80KB each = ~10MB total — must preload with link hints + WebP/AVIF.
- Target: 60fps desktop, 30fps mobile (acceptable degraded).
- Fallback: if `prefers-reduced-motion` or device DPR < 1.5, replace with single static frame.

---

## 2. PREMIUM-BENTO — 3D Pin Tile with Hover Tilt

### Concept
One bento tile holds an `<A.3d-pin>` (Aceternity 3D pin) — a card that tilts in 3D space following mouse position with soft shadows.

### Skeleton (TSX)

```tsx
'use client'
import { PinContainer } from '@/components/ui/3d-pin' // Aceternity 3D Pin
import { motion } from 'framer-motion'

export function FeaturePinTile() {
  return (
    <div className="col-span-4 row-span-2 rounded-2xl bg-[oklch(0.18_0.014_250)]
                    ring-1 ring-white/8">
      <PinContainer title="Live inspector" href="/features/inspector">
        <motion.div
          className="flex h-72 w-72 flex-col p-4"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <h3 className="text-lg font-semibold text-[oklch(0.96_0.005_80)]">
            Inspector
          </h3>
          <p className="mt-2 text-sm text-[oklch(0.62_0.012_250)]">
            Trace any request without leaving the editor.
          </p>
        </motion.div>
      </PinContainer>
    </div>
  )
}
```

### GLSL — soft shadow plane (optional drop)

```glsl
// fragmentShader for ground shadow plane
precision highp float;
varying vec2 vUv;
uniform float uOpacity;
void main() {
  float d = distance(vUv, vec2(0.5));
  float a = smoothstep(0.5, 0.05, d) * uOpacity;
  gl_FragColor = vec4(0.0, 0.0, 0.0, a * 0.35);
}
```

### Perf budget
- Triangles: < 200 per tile (pin geometry).
- Draw calls: ≤ 8 per tile.
- Limit: max 2 3D-pin tiles per bento grid — others must stay 2D.
- Target: 60fps desktop, 45fps mobile.
- Fallback: on `prefers-reduced-motion`, disable tilt — render static card with shadow.

---

## 3. BRUTALISM — Distorted Plane + Noise + Dissolve

### Concept
Single full-bleed plane displaying a photograph distorted by Perlin noise. On scroll, the noise frequency increases, simulating dissolve / corruption. Hard cuts on transitions.

### Skeleton (TSX)

```tsx
'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uImage;
  uniform float uNoise;
  uniform float uTime;

  float rand(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;
    float n = rand(uv * 200.0 + uTime * 0.1) * uNoise;
    uv.x += (n - 0.5) * 0.05;
    vec4 col = texture2D(uImage, uv);
    // dissolve threshold
    if (n > 0.85) discard;
    gl_FragColor = vec4(col.rgb, 1.0);
  }
`

function DistortedPlane({ scroll }: { scroll: { current: number } }) {
  const ref = useRef<THREE.ShaderMaterial>(null!)
  useFrame(({ clock }) => {
    ref.current.uniforms.uTime.value = clock.elapsedTime
    ref.current.uniforms.uNoise.value = scroll.current * 0.8
  })
  return (
    <mesh>
      <planeGeometry args={[16, 9, 64, 64]} />
      <shaderMaterial
        ref={ref}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uImage: { value: null }, // texture loader assigns
          uNoise: { value: 0 },
          uTime: { value: 0 },
        }}
      />
    </mesh>
  )
}
```

### Perf budget
- Triangles: ~8000 (subdivided plane for distortion).
- Draw calls: < 5.
- Target: 60fps desktop, 30fps mobile.
- Fallback: static unmodified image + CSS grain overlay.

---

## 4. DARK-LUXE — Fresnel Rim Lighting + Slow Rotation

### Concept
A single hero object (bottle, product, abstract sculpture) slowly rotates with rim-lit fresnel shader. Background stays drenched dark. Mouse position subtly affects rim light angle.

### GLSL — fresnel material

```glsl
// vertexShader
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mvPos.xyz);
  gl_Position = projectionMatrix * mvPos;
}

// fragmentShader
precision highp float;
varying vec3 vNormal;
varying vec3 vViewDir;
uniform vec3 uBaseColor;
uniform vec3 uRimColor;
uniform float uRimPower;
void main() {
  float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), uRimPower);
  vec3 col = mix(uBaseColor, uRimColor, fresnel);
  gl_FragColor = vec4(col, 1.0);
}
```

### Skeleton (TSX)

```tsx
'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, useGLTF } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'

function HeroObject() {
  const ref = useRef<THREE.Mesh>(null!)
  const { scene } = useGLTF('/models/bottle.glb')
  useFrame((_, dt) => { ref.current.rotation.y += dt * 0.1 })
  return <primitive ref={ref} object={scene} />
}

export function DarkLuxeHero() {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 3], fov: 30 }}>
      <Environment preset="night" />
      <HeroObject />
    </Canvas>
  )
}
```

### Perf budget
- Triangles: < 25k for hero object (GLB optimized).
- Draw calls: < 12.
- Target: 60fps desktop, 30fps mobile (lower DPR).
- Fallback: high-quality static render of the rotation pose.

---

## 5. EDITORIAL-PREMIUM — Minimal Scroll-Driven Canvas Behind Hero

### Concept
Behind the editorial hero text, a near-imperceptible canvas with slow drift particles or subtle film-grain shader. Motion barely visible — adds atmosphere without breaking reading rhythm.

### GLSL — film grain

```glsl
precision highp float;
varying vec2 vUv;
uniform float uTime;
float rand(vec2 p) {
  return fract(sin(dot(p + uTime, vec2(12.9898, 78.233))) * 43758.5453);
}
void main() {
  float g = rand(vUv * 800.0);
  gl_FragColor = vec4(vec3(g), 0.05); // very low alpha
}
```

### Perf budget
- Triangles: 2 (one plane).
- Draw calls: < 3.
- Target: 60fps everywhere — this must NOT cost performance.
- Fallback: SVG noise filter as background-image.

---

## 6. MONOCHROME-MODERN — Black & White Shader + Posterize

### Concept
Hero image (or video loop) runs through a B&W + posterize shader to lock into the monochrome palette regardless of source material. Adds intentional crunch and contrast.

### GLSL

```glsl
precision highp float;
varying vec2 vUv;
uniform sampler2D uImage;
uniform float uLevels;
void main() {
  vec4 col = texture2D(uImage, vUv);
  float luma = dot(col.rgb, vec3(0.299, 0.587, 0.114));
  float posterized = floor(luma * uLevels) / uLevels;
  gl_FragColor = vec4(vec3(posterized), 1.0);
}
```

Suggested uniforms: `uLevels = 5.0` for a crunchy 5-step posterize.

### Perf budget
- Triangles: 2.
- Draw calls: < 3.
- Target: 60fps everywhere.
- Fallback: CSS `filter: grayscale(1) contrast(1.3)` on `<img>`.

---

## 7. GLOBAL 3D RULES

1. **NEVER mount Canvas above the fold without Suspense + skeleton.** Law 4 (no `dynamic({ ssr: false })` for hero — use `<Suspense>` boundary).
2. **Always test with throttled CPU (4x slowdown)** before approving.
3. **Always honor `prefers-reduced-motion`** — replace with static fallback.
4. **Texture budget**: total textures per page ≤ 15MB compressed.
5. **Triangle budget per page**: ≤ 100k.
6. **Draw call budget per page**: ≤ 80.
7. **Use `dpr={[1, 2]}` clamp**, never default `dpr` (will balloon on Retina).
8. **Dispose properly** — every Canvas mount must include cleanup in `useEffect` or rely on R3F's automatic GC. Confirm via `THREE.Cache` inspector before shipping.
9. **No mixing GSAP + R3F useFrame in the same component** — choose one motion driver per scene.
10. **All shader uniforms must be typed and named with `u` prefix** so the auditor can grep for non-conformant uniforms.

---

## 8. AUDITOR HOOKS

The `wow-code-auditor` greps for these signals when validating 3D scenes:

- `import { Canvas }` must be paired with `'use client'` in the file.
- `dynamic.*Canvas` must be paired with `loading: () => <Skeleton />` (not `null`).
- Every `<Canvas>` must have an explicit `dpr` prop.
- Every shader file must define both `vertexShader` and `fragmentShader` (no implicit defaults).
- No `setInterval` or `requestAnimationFrame` driving 3D state outside `useFrame`.
