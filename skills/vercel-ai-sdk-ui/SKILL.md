---
name: vercel-ai-sdk-ui
description: |
  Vercel AI SDK UI (`@ai-sdk/react`). Hooks `useChat`, `useCompletion`, `useObject` para streaming LLM en React. Soporta OpenAI, Anthropic, Google, MiniMax via providers. RSC + Server Actions ready. Trigger: ai-sdk, useChat, streaming, llm chat, openai, anthropic, minimax frontend, ai chat.
when_to_use: |
  Construir UI de chat con streaming en React/Next.
  Generación estructurada (`useObject` con Zod schema).
  Multi-step tools/agents en el frontend.
  Integración con MiniMax M2.7 (OpenAI-compatible) o Claude.
when_NOT_to_use: |
  Backend puro sin React (usá `ai` package directo).
  Solo necesitas un LLM call no-streaming (fetch normal).
---

# Vercel AI SDK UI

Hooks React para streaming LLM con providers compatibles (OpenAI, Anthropic, Google, MiniMax).

## Install

```bash
pnpm add ai @ai-sdk/react @ai-sdk/openai @ai-sdk/anthropic zod
```

## Setup con MiniMax M2.7 (OpenAI-compatible)

```ts
// app/api/chat/route.ts (Next.js App Router)
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const minimax = createOpenAI({
  baseURL: "https://api.minimax.io/v1",
  apiKey: process.env.MINIMAX_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: minimax("MiniMax-M2.7"),
    messages,
    temperature: 1.0,   // M2.7 oficial recomienda 1.0
    topP: 0.95,
  });
  return result.toDataStreamResponse();
}
```

## Setup con Claude

```ts
import { createAnthropic } from "@ai-sdk/anthropic";

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const result = streamText({
  model: anthropic("claude-sonnet-4-6"),
  messages,
});
```

## `useChat` (chat con streaming)

```tsx
"use client";
import { useChat } from "@ai-sdk/react";

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} disabled={isLoading} />
      </form>
    </div>
  );
}
```

## `useObject` (generación estructurada con Zod)

```ts
// API route
import { streamObject } from "ai";
import { z } from "zod";

const recipeSchema = z.object({
  name: z.string(),
  steps: z.array(z.string()),
  ingredients: z.array(z.object({ name: z.string(), qty: z.string() })),
});

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const result = streamObject({ model: minimax("MiniMax-M2.7"), schema: recipeSchema, prompt });
  return result.toTextStreamResponse();
}
```

```tsx
// Cliente
"use client";
import { useObject } from "@ai-sdk/react";

export default function RecipeGen() {
  const { object, submit, isLoading } = useObject({ api: "/api/recipe", schema: recipeSchema });
  return (
    <div>
      <button onClick={() => submit({ prompt: "Pasta carbonara" })}>Generate</button>
      {object && <pre>{JSON.stringify(object, null, 2)}</pre>}
    </div>
  );
}
```

## Tools (function calling)

```ts
import { streamText, tool } from "ai";
import { z } from "zod";

const result = streamText({
  model: minimax("MiniMax-M2.7"),
  messages,
  tools: {
    weather: tool({
      description: "Get weather for a city",
      parameters: z.object({ city: z.string() }),
      execute: async ({ city }) => ({ temp: 22, condition: "sunny" }),
    }),
  },
});
```

## Reglas no negociables

1. **NO hardcodear API keys en cliente** — siempre proxy via Server Action o API route.
2. **`toDataStreamResponse()`** en Next App Router — devuelve formato correcto para `useChat`.
3. **Provider correcto**: para MiniMax usá `@ai-sdk/openai` con `baseURL` custom (es OpenAI-compatible).
4. **Sampling MiniMax**: `temperature=1.0`, `topP=0.95` — NO bajar a 0, degrada output.
5. **`messages` con `id` único** — `useChat` lo asigna, no lo sobrescribas.
6. **`isLoading`** para disable input — UX cuando streamea.
7. **`reasoning_details` con M2.7**: si usás thinking mode, preservá el campo entre turnos (ver skill `minimax-think-preserver`).

## Streaming UI components premium

- [shadcn-chat-ui](https://github.com/jakobhoeg/shadcn-chat) — componentes chat shadcn-style
- [chat-bubbles](https://chat.scira.ai/) — referencia de UX premium

## Recursos

- Docs: https://sdk.vercel.ai
- Providers: https://sdk.vercel.ai/providers/ai-sdk-providers
- Cookbook: https://sdk.vercel.ai/cookbook
- MiniMax docs: https://platform.minimax.io/docs/api-reference/text-openai-api
