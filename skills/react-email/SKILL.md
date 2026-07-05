---
name: react-email
description: |
  React Email v5 — escribir emails transaccionales con componentes React + Tailwind 4. Resend lo creó. Soporta dark mode, MJML internamente, preview server local. Trigger: email, transactional, resend, mailgun, sendgrid, welcome email, password reset, invoice email.
when_to_use: |
  Emails transaccionales (welcome, password reset, invoice, magic link).
  Newsletters con HTML rico.
  Integración con Resend/Mailgun/SendGrid/Postmark.
  Preview server local para diseñar emails.
when_NOT_to_use: |
  Marketing emails masivos (usá Mailchimp/Beehiv directo).
  Mass send sin opt-in (legal: GDPR/CAN-SPAM).
---

# React Email v5

Emails transaccionales con DX premium — React + Tailwind, dark mode, preview local.

## Install

```bash
pnpm add react-email @react-email/components
# Preview server (dev):
pnpm dlx react-email dev
# Render a HTML:
pnpm add -D @react-email/render
```

## Estructura proyecto

```
emails/
  welcome.tsx       <- componentes React
  password-reset.tsx
  invoice.tsx
src/
  lib/email.ts      <- helper de send
```

## Email básico

```tsx
// emails/welcome.tsx
import { Html, Head, Body, Container, Heading, Text, Button, Tailwind } from "@react-email/components";

export default function WelcomeEmail({ name }: { name: string }) {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto max-w-[560px] p-6">
            <Heading className="text-2xl font-bold text-gray-900">Bienvenido, {name}</Heading>
            <Text className="text-base text-gray-700">Gracias por registrarte. Confirmá tu cuenta:</Text>
            <Button
              href="https://app.com/verify?token=abc"
              className="rounded-md bg-black px-6 py-3 text-white"
            >
              Confirmar email
            </Button>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

## Send con Resend

```bash
pnpm add resend
```

```ts
// src/lib/email.ts
import { Resend } from "resend";
import WelcomeEmail from "../../emails/welcome";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcome(to: string, name: string) {
  await resend.emails.send({
    from: "App <hello@app.com>",
    to,
    subject: "Bienvenido a App",
    react: WelcomeEmail({ name }),
  });
}
```

## Preview server (dev)

```bash
pnpm dlx react-email dev
# Abre http://localhost:3000 con todos los emails de /emails
```

Hot-reload automático, soporte dark mode toggle, mobile preview.

## Render a HTML/text (SSR o cron)

```ts
import { render } from "@react-email/render";
const html = await render(WelcomeEmail({ name: "Nico" }));
const text = await render(WelcomeEmail({ name: "Nico" }), { plainText: true });
```

## Componentes built-in

| Componente | Uso |
|---|---|
| `<Html>` `<Head>` `<Body>` | Wrapper obligatorio |
| `<Container>` | Box centrado max-width |
| `<Section>` | Bloque vertical |
| `<Heading>` | h1-h6 con styling email-safe |
| `<Text>` | p con line-height email-safe |
| `<Button>` | Botón table-based (Outlook compat) |
| `<Img>` | Image con width/height obligatorio |
| `<Link>` | Anchor styled |
| `<Hr>` | Divider |
| `<Tailwind>` | Habilita className Tailwind |
| `<Preview>` | Texto preheader (lo que ve antes de abrir) |
| `<CodeBlock>` `<CodeInline>` | Para emails dev |

## Reglas no negociables

1. **`<Tailwind>` o nada** — sin él los className Tailwind se ignoran.
2. **Width images obligatorio** — Outlook rompe sin `width=`.
3. **`<Preview>`** siempre como primer hijo de `<Body>` — controla preheader.
4. **Inline styles con Tailwind** — React Email los convierte automático. NO uses `<style>` en `<Head>` salvo media queries.
5. **Dark mode**: usá `dark:` prefix de Tailwind. Probá en Apple Mail (mejor cliente para dark).
6. **Test en**: Gmail (web/iOS), Outlook (Windows), Apple Mail (macOS), Yahoo. Usá [Litmus](https://litmus.com) o [Email on Acid](https://emailonacid.com).
7. **Subject + preheader siempre distintos** — no repitas.

## Anti-patrones

- ❌ Usar componentes React custom complejos — emails NO son apps SPA.
- ❌ Animaciones / gradientes sin fallback — Outlook los descarta.
- ❌ Background images sin VML fallback — Outlook no las soporta.
- ❌ Fuentes web sin fallback — `font-family: 'Inter', system-ui, sans-serif` mínimo.

## Recursos

- Docs: https://react.email
- Repo: https://github.com/resend/react-email
- Templates: https://react.email/templates
- Resend: https://resend.com (provider recomendado)
