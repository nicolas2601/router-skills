---
name: scroll-scrub-canvas
description: Patrón Apple AirPods Pro / MacBook marketing - hero con video renderizado como secuencia de frames JPG/WebP en canvas, scrubbed por scroll position. NO `<video>` tag (degrada en mobile + sin control fino del scrub). El componente preload todos los frames + IntersectionObserver para pause off-screen + dpr-aware resize + prefers-reduced-motion fallback. Trigger scroll-scrub, scrub video, frame sequence canvas, apple airpods landing, hero scrubbed.
when_to_use: |
  Hero cinematográfico tipo Apple/Stripe/Sony Bravia.
  Video corto (5-15s ideal) que el cliente quiere "scrubbeable" con scroll.
  Necesitás control fino del playback (NO basta `<video>` autoplay).
  Cliente ok con extraer frames pre-deploy (ffmpeg pipeline).
when_NOT_to_use: |
  Video largo (>20s) — los frames pesarían demasiado (>20MB Vercel hobby cap).
  Cliente quiere audio en el video — los frames no tienen audio (separar a `<audio>` aparte).
  Mobile-only — preload de 240+ frames mata datos. Considerar versión reducida o `<video>`.
---

# Scroll-Scrub Canvas

Pattern Apple AirPods Pro: hero como canvas frame-indexed, scrubbed por scroll position.

## Por qué canvas y no `<video>`

| Problema con `<video>` | Solución con canvas |
|---|---|
| `currentTime` setter es laggy en mobile | Frames preloaded, swap O(1) |
| Sin control fino de qué frame mostrar | Index directo al array |
| Mobile autoplay restrictions | No autoplay needed, draw-on-scroll |
| Codec issues cross-browser | JPG/WebP universal |
| LCP impredecible | Frame_0001 priority preload |

## Frame extraction pipeline

### Step 1: extraer frames con ffmpeg

```bash
mkdir -p input public/frames
# Source video en /input/source.mp4 (gitignored)
ffmpeg -i input/source.mp4 \
  -vf "fps=30,scale='min(1920,iw)':'-2':flags=lanczos" \
  -q:v 3 \
  public/frames/frame_%04d.jpg

# Contar frames y pegar en FRAME_COUNT
ls public/frames | wc -l
```

### Step 2 (opcional): convert a WebP (~40% más chico)

```bash
for f in public/frames/*.jpg; do
  cwebp -q 82 "$f" -o "${f%.jpg}.webp" && rm "$f"
done
```

### Step 3: gitignore source

```
# .gitignore
input/
```

### Reglas

- Filenames: zero-padded 4-digit (`frame_0001.jpg` … `frame_NNNN.jpg`)
- FPS típico 30 para 5-10s video → 150-300 frames
- Total payload < 20MB (Vercel hobby cap es 25MB)
- Si excede: usar WebP, reducir resolución, o subir a CDN external

## Component completo (TypeScript + React)

```tsx
import { useEffect, useRef } from "react";

export type ScrubSequenceProps = {
  framesPath: string;      // "/frames"
  frameCount: number;      // 240
  ext?: "jpg" | "webp";    // default "jpg"
  className?: string;
  scrollTargetRef: React.RefObject<HTMLElement>;
};

const pad4 = (n: number) => String(n).padStart(4, "0");

export function ScrubSequence({
  framesPath,
  frameCount,
  ext = "jpg",
  className,
  scrollTargetRef,
}: ScrubSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const rafRef = useRef<number | null>(null);
  const visible = useRef(true);
  const prefersReduced = useRef(
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  // Preload todos los frames
  useEffect(() => {
    const imgs: HTMLImageElement[] = [];
    const urls = Array.from(
      { length: frameCount },
      (_, i) => `${framesPath}/frame_${pad4(i + 1)}.${ext}`
    );
    // Frame 1 priority-loaded para LCP
    const first = new Image();
    first.src = urls[0];
    // @ts-ignore
    first.fetchPriority = "high";
    imgs[0] = first;
    urls.slice(1).forEach((src, i) => {
      const img = new Image();
      img.src = src;
      imgs[i + 1] = img;
    });
    imagesRef.current = imgs;
  }, [framesPath, frameCount, ext]);

  // Resize canvas a viewport con dpr cap 2
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      drawFrame(currentIndex());
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Pause rAF cuando off-screen (perf)
  useEffect(() => {
    const el = scrollTargetRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { visible.current = entry.isIntersecting; },
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [scrollTargetRef]);

  // rAF scroll loop
  useEffect(() => {
    const tick = () => {
      if (visible.current && !prefersReduced.current) {
        drawFrame(currentIndex());
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // prefers-reduced-motion: render solo el frame del medio
  useEffect(() => {
    if (prefersReduced.current) {
      const mid = Math.floor(frameCount / 2);
      const img = imagesRef.current[mid];
      if (img?.complete) drawImage(img);
      else img?.addEventListener("load", () => drawImage(img), { once: true });
    }
  }, [frameCount]);

  const currentIndex = () => {
    const el = scrollTargetRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const total = el.offsetHeight - window.innerHeight;
    const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
    return Math.min(frameCount - 1, Math.floor(progress * (frameCount - 1)));
  };

  const drawFrame = (idx: number) => {
    const img = imagesRef.current[idx];
    if (img && img.complete && img.naturalWidth > 0) drawImage(img);
  };

  const drawImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    // object-cover math
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  };

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{ transform: "translateZ(0)", willChange: "contents" }}
    />
  );
}
```

## Hero wrapper pattern

```tsx
export function Hero({ scrollRef }: { scrollRef: React.RefObject<HTMLElement> }) {
  return (
    <section ref={scrollRef} className="relative h-[250vh] bg-background">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <ScrubSequence
          framesPath="/frames"
          frameCount={240}
          ext="jpg"
          scrollTargetRef={scrollRef}
          className="absolute inset-0 w-full h-full z-0"
        />
        {/* sr-only describe el video para a11y */}
        <p className="sr-only">Video showing [describir el contenido del video aquí].</p>

        {/* Vignette */}
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(120%_80%_at_50%_60%,transparent_40%,rgba(0,0,0,0.55)_100%)]" />

        {/* Bottom fade */}
        <div className="absolute bottom-0 inset-x-0 h-[40vh] z-[2] bg-gradient-to-t from-background to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
          {/* Headline + CTAs */}
        </div>
      </div>
    </section>
  );
}
```

## Reglas no-negociables

1. **Sección outer = `h-[250vh]`** (o más si frames > 240). Da scroll para playback completo.
2. **Inner `sticky top-0 h-screen`** — pin canvas mientras el outer scrollea.
3. **Canvas absoluto inset-0 z-0** dentro del sticky.
4. **Content `z-10`**, encima del canvas.
5. **`aria-hidden="true"` en canvas + `<p className="sr-only">` describe video** (a11y).
6. **Preload `frame_0001` con `fetchpriority="high"`** + `<link rel="preload" as="image" href="/frames/frame_0001.jpg" fetchpriority="high">` en `index.html`.
7. **dpr cap a 2** para no matar mobile.
8. **IntersectionObserver pause** cuando off-screen (ahorra batería + CPU).
9. **`prefers-reduced-motion` → render frame del medio** (estático).
10. **NO usar `useScroll` de Framer Motion** — es más lento que rAF directo para este caso.

## Anti-patrones

- `<video src="x.mp4" />` con `currentTime` setter en `onScroll` → laggy mobile.
- Loop infinito `setInterval` para draw → no respeta scroll, drift visible.
- Sin `requestAnimationFrame` → scroll se siente cortado.
- Sin pause off-screen → batería mobile drena.
- Sin priority preload frame 1 → LCP > 4s.

## Sizing del scroll range

| FRAME_COUNT | Section height óptimo |
|---|---|
| 90 (3s @ 30fps) | `h-[150vh]` |
| 150 (5s) | `h-[200vh]` |
| 240 (8s) | `h-[250vh]` |
| 300 (10s) | `h-[300vh]` |
| 450 (15s) | `h-[400vh]` |

Si el scroll va MUY rápido y el video se siente "saltado": aumentar height. Si va MUY lento y aburre: reducir.

## Recursos

- Apple AirPods Pro (referencia visual): https://www.apple.com/airpods-pro/
- ffmpeg docs: https://ffmpeg.org/documentation.html
- Article original (técnica): https://web.archive.org/web/20210306022055/https://blog.apify.com/canvas-scroll-animation/
- Skill `cinematic-landing-template` para el contexto completo de uso
