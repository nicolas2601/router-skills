---
name: tanstack-query-form
description: |
  TanStack Query v5 (server state) + TanStack Form v1 (forms type-safe con Zod) + TanStack Table v8. Estándar de facto 2026 para data fetching y forms en React. Úsalo en cualquier app React/Next que consume APIs y maneja forms complejos. Trigger: tanstack, react-query, useQuery, react-form, react-table, server state, form validation, data fetching.
when_to_use: |
  Apps React/Next con APIs (REST/GraphQL/RPC).
  Forms con validación tipada (con Zod).
  Tables con sort/filter/pagination/virtualization.
  Optimistic updates + cache invalidation.
when_NOT_to_use: |
  Apps que solo usan Server Components + Server Actions sin client state (usá `useFormState`).
  Forms triviales (1-2 fields) — `useState` suficiente.
  Datos triviales que no cambian — `fetch` + `cache: 'force-cache'`.
---

# TanStack Query + Form + Table

## Install

```bash
pnpm add @tanstack/react-query @tanstack/react-form @tanstack/react-table zod
pnpm add -D @tanstack/react-query-devtools
```

## TanStack Query v5

### Setup (root)

```tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false },
  },
});

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
```

### Query

```tsx
import { useQuery } from "@tanstack/react-query";

const { data, isPending, error } = useQuery({
  queryKey: ["users", userId],
  queryFn: () => fetch(`/api/users/${userId}`).then(r => r.json()),
});
```

### Mutation + invalidate

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";

const qc = useQueryClient();
const m = useMutation({
  mutationFn: (data) => fetch("/api/users", { method: "POST", body: JSON.stringify(data) }),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
});
```

### Optimistic update

```tsx
const m = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await qc.cancelQueries({ queryKey: ["todos"] });
    const previous = qc.getQueryData(["todos"]);
    qc.setQueryData(["todos"], (old) => [...old, newTodo]);
    return { previous };
  },
  onError: (err, _, ctx) => qc.setQueryData(["todos"], ctx.previous),
  onSettled: () => qc.invalidateQueries({ queryKey: ["todos"] }),
});
```

## TanStack Form v1 + Zod

```tsx
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  age: z.number().min(18),
});

const form = useForm({
  defaultValues: { email: "", age: 18 },
  validatorAdapter: zodValidator(),
  validators: { onChange: schema },
  onSubmit: async ({ value }) => { await api.post("/users", value); },
});

<form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
  <form.Field name="email">
    {(f) => (
      <>
        <input value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} />
        {f.state.meta.errors[0] && <span>{f.state.meta.errors[0]}</span>}
      </>
    )}
  </form.Field>
  <form.Subscribe>{(s) => <button disabled={!s.canSubmit}>Submit</button>}</form.Subscribe>
</form>
```

## TanStack Table v8 (resumido)

```tsx
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
});
```

Para sort/filter/pagination/virtualization importar `getSortedRowModel`, `getFilteredRowModel`, `getPaginationRowModel`, y combinar con `@tanstack/react-virtual`.

## Reglas no negociables

1. **`queryKey` consistente**: array, primer elemento entidad, segundo ID. `["users", id]`, no `["user-" + id]`.
2. **`staleTime` por query**: default 60s arriba — sobrescribir si el dato es realtime (0) o estático (Infinity).
3. **`enabled`** para deps: `useQuery({ enabled: !!userId, ... })` evita fetch antes de tener id.
4. **Suspense mode** si usas RSC: `useSuspenseQuery` + `<Suspense>`.
5. **Form: `validators.onChange`** con Zod, no `onSubmit` only — feedback inmediato.
6. **NO mezclar** TanStack Form con react-hook-form — elegí uno por proyecto.

## Recursos

- Query: https://tanstack.com/query
- Form: https://tanstack.com/form
- Table: https://tanstack.com/table
- Devtools: https://tanstack.com/query/latest/docs/framework/react/devtools
