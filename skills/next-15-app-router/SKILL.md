---
name: next-15-app-router
description: |
  Next.js 15 App Router patterns — Server Components, Server Actions, parallel routes, intercepting routes, partial prerendering, streaming, error/loading boundaries. Foco en lo NUEVO de Next 15 (PPR estable, async params, after()). Trigger: next, next.js, app router, server actions, rsc, ppr, partial prerendering.
when_to_use: |
  App Next.js 15 nueva o migración desde Pages Router.
  Server Actions con form mutations.
  Parallel/intercepting routes (modals con URL).
  Streaming + Suspense para UX premium.
when_NOT_to_use: |
  Static site (Astro mejor).
  App con Pages Router legacy (no migres si no hay razón).
  SPA pura (Vite + React Router).
---

# Next.js 15 App Router

## Crear proyecto

```bash
pnpm create next-app@latest my-app --turbopack --typescript --tailwind --app
```

## Estructura clave

```
app/
  layout.tsx          <- Server Component root
  page.tsx            <- /
  loading.tsx         <- Suspense fallback
  error.tsx           <- Error boundary (must be 'use client')
  not-found.tsx       <- 404
  (group)/            <- Route group (no afecta URL)
  [id]/page.tsx       <- /[id]
  @modal/             <- Parallel route slot
  (.)photo/[id]/      <- Intercepting route
  api/route.ts        <- API endpoint
```

## Server Components (default)

```tsx
// app/users/page.tsx — Server Component
import { db } from "@/lib/db";

export default async function Users() {
  const users = await db.user.findMany();  // direct DB query, NO API needed
  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

## Async params (Next 15 — BREAKING)

```tsx
// app/posts/[slug]/page.tsx
export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;  // params es Promise en Next 15
  return <h1>{slug}</h1>;
}
```

## Server Actions (forms sin API routes)

```tsx
// app/contact/page.tsx
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function submit(formData: FormData) {
  "use server";
  const email = formData.get("email") as string;
  await db.contact.create({ data: { email } });
  revalidatePath("/contact");
  redirect("/thanks");
}

export default function Page() {
  return (
    <form action={submit}>
      <input name="email" type="email" required />
      <button type="submit">Enviar</button>
    </form>
  );
}
```

## Streaming + Suspense

```tsx
// app/dashboard/page.tsx
import { Suspense } from "react";
import { Skeleton } from "@/components/Skeleton";

export default function Dashboard() {
  return (
    <>
      <h1>Dashboard</h1>
      <Suspense fallback={<Skeleton />}>
        <SlowData />
      </Suspense>
    </>
  );
}

async function SlowData() {
  const data = await fetch("...", { next: { revalidate: 60 } }).then(r => r.json());
  return <div>{data.text}</div>;
}
```

## Partial Prerendering (PPR — estable en Next 15)

```ts
// next.config.ts
export default { experimental: { ppr: "incremental" } };
```

```tsx
// app/page.tsx
export const experimental_ppr = true;

export default function Home() {
  return (
    <>
      <StaticHero />  {/* prerenderea */}
      <Suspense fallback={<Loading />}>
        <DynamicCart />  {/* streamea */}
      </Suspense>
    </>
  );
}
```

PPR = mejor de SSG (perf) + SSR (dinámico) en la misma page.

## Parallel routes (modales con URL)

```
app/
  layout.tsx          <- recibe { children, modal } props
  page.tsx
  @modal/
    default.tsx       <- () => null (cuando no hay modal)
    (.)photo/[id]/page.tsx
```

```tsx
// app/layout.tsx
export default function Layout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
```

## `after()` (Next 15 estable)

Ejecutar código DESPUÉS de la response (analytics, logs, no bloqueá render):

```ts
import { after } from "next/server";

export default async function Page() {
  const data = await getData();

  after(async () => {
    await analytics.track("page_view", { page: "/dashboard" });
  });

  return <div>{data}</div>;
}
```

## Caching (Next 15 — DEFAULT CHANGED)

Next 15 cambió defaults: **`fetch` ya NO cachea por default**.

```ts
// Cache opt-in:
fetch(url, { cache: "force-cache" });
fetch(url, { next: { revalidate: 3600 } });

// Default (uncached):
fetch(url);
```

## Reglas no negociables

1. **Server Components por default** — usá `'use client'` SOLO si necesitás state/effects/browser APIs.
2. **`fetch` con revalidate** explícito — Next 15 no cachea por default.
3. **`async params`** — el upgrade a Next 15 obliga a `await params`.
4. **Server Actions con Zod** — validá `formData` con schema compartido.
5. **`<Suspense>` por default** — no esperes a tener slow data; envolvé desde el principio.
6. **`error.tsx` por route segment** — recovery granular.
7. **`<Image>` de `next/image`** SIEMPRE — nunca `<img>` en producción.
8. **Metadata** export en cada page — SEO no-negociable.
9. **`use server` solo en Server Actions** — NO uses en Server Components (default ya es server).

## Anti-patrones

- ❌ `'use client'` en root — perdés todo el beneficio RSC.
- ❌ `useEffect` para fetch en Server Components — usá async directo.
- ❌ API route + fetch para data del propio app — query la DB en Server Component.
- ❌ `Promise.all` sin `await` correcto en Server Components.

## Recursos

- Docs: https://nextjs.org/docs
- App Router learn: https://nextjs.org/learn/dashboard-app
- Migration v14→v15: https://nextjs.org/docs/app/building-your-application/upgrading/version-15
- PPR: https://nextjs.org/docs/app/api-reference/config/next-config-js/ppr
