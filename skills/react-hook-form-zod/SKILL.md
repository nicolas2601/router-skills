---
name: react-hook-form-zod
description: |
  react-hook-form + Zod + @hookform/resolvers/zod. Forms más usados en React 2026 — más simple que TanStack Form para casos comunes. Server Actions ready en Next.js. Trigger: react-hook-form, rhf, zod, form validation, useForm.
when_to_use: |
  Forms de complejidad media (3-15 fields) en React.
  Server Actions de Next.js + validación cliente+servidor compartida.
  Forms con react-server-components + progressive enhancement.
when_NOT_to_use: |
  Forms con campos dinámicos heavy (TanStack Form mejor).
  Forms de 1 campo (useState).
  Sin React (Zod sí, RHF no aplica).
---

# react-hook-form + Zod

## Install

```bash
pnpm add react-hook-form zod @hookform/resolvers
```

## Setup básico

```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  age: z.coerce.number().min(18),
});

type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", age: 18 },
  });

  const onSubmit = async (data: FormData) => { await api.post("/login", data); };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} />
      {errors.email && <span>{errors.email.message}</span>}

      <input type="password" {...register("password")} />
      {errors.password && <span>{errors.password.message}</span>}

      <button disabled={isSubmitting}>Submit</button>
    </form>
  );
}
```

## Patterns clave

### 1. Compartir schema cliente + servidor (Server Action)

```ts
// schemas/login.ts (compartido)
import { z } from "zod";
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
export type LoginInput = z.infer<typeof loginSchema>;
```

```tsx
// Cliente
import { loginSchema } from "@/schemas/login";
const form = useForm({ resolver: zodResolver(loginSchema) });
```

```ts
// Server Action
"use server";
import { loginSchema } from "@/schemas/login";

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.flatten() };
  // ...
}
```

### 2. Custom field con Controller

```tsx
import { Controller } from "react-hook-form";

<Controller
  name="country"
  control={control}
  render={({ field }) => <Select value={field.value} onValueChange={field.onChange} />}
/>
```

### 3. Field arrays (lista dinámica)

```tsx
import { useFieldArray } from "react-hook-form";

const { fields, append, remove } = useFieldArray({ control, name: "items" });

{fields.map((f, i) => (
  <div key={f.id}>
    <input {...register(`items.${i}.name`)} />
    <button onClick={() => remove(i)}>X</button>
  </div>
))}
<button onClick={() => append({ name: "" })}>Add</button>
```

### 4. Async validation

```ts
const schema = z.object({
  username: z.string().min(3).refine(async (val) => {
    const res = await fetch(`/api/check-username?u=${val}`);
    return (await res.json()).available;
  }, "Username ya existe"),
});
```

## Reglas no negociables

1. **`zodResolver` siempre** — nunca validación manual con `if`.
2. **`z.coerce.*`** para inputs (números, fechas) — los `<input>` devuelven strings.
3. **`defaultValues` siempre** — evita warning "controlled to uncontrolled".
4. **`isSubmitting`** para disable button — UX buena.
5. **Schema compartido cliente+servidor** — un solo source of truth.
6. **NO usar `register` con custom components** — usá `<Controller>`.
7. **Errores en español** definidos en el schema, no inventados en JSX.

## Anti-patrones

- ❌ `onChange={(e) => setValue(...)}` manual — RHF maneja todo.
- ❌ Validar 2 veces (RHF + custom). Confiá en Zod.
- ❌ `{...register("name", { required: "..." })}` — usá Zod schema.

## Recursos

- RHF: https://react-hook-form.com
- Zod: https://zod.dev
- Resolvers: https://github.com/react-hook-form/resolvers
- Conform.js (alternativa Server Actions native): https://conform.guide
