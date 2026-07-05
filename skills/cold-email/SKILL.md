---
name: cold-email
description: Hunt job posts that include a recruiter email (canales públicos de Telegram t.me/s/ y LinkedIn), filter by low competition, send a personalized cold email from nm5571762@gmail.com with the PDF CV v5 attached, and log every recipient to prevent duplicates. Use when the user asks to send cold emails, "buscar y mandar correos a reclutadores", apply via LinkedIn/Telegram email posts, or invokes /cold-email or /job-apply-linkedin.
---

# Job Apply LinkedIn Emails — Skill

Specialized workflow for **Nicolás Santiago Moreno Monroy** to find LinkedIn job posts that contain a direct recruiter email (the kind that says "envía tu CV al correo X" or "send your CV to X"), filter for posts with low competition, and apply with a polished, personalized cold email + PDF CV attachment.

## Sender Profile (hardcoded — never improvise)

| Field | Value |
|-------|-------|
| Sender email | `nm5571762@gmail.com` (envío via Gmail web + Playwright, NUNCA SMTP) |
| Send channel | **Playwright on `mail.google.com`** — assumes active session in the browser |
| CV path | **v5, elegir por idioma**: ES → `/home/nicolas/cv/CV_Nicolas_Moreno_v5_ATS.pdf` · EN → `/home/nicolas/cv/CV_Nicolas_Moreno_v5_EN.pdf` — adjuntar en cada compose el correcto según el idioma del post |
| Display name | `Nicolás Moreno` |
| Phone / WhatsApp | `+57 350 232 8517` |
| LinkedIn | `https://www.linkedin.com/in/nicolas-moreno-dev` |
| GitHub | `https://github.com/nicolas2601` |
| Portfolio | `https://nicolasmoreno.site/` |
| Title | Software Engineer / Full-Stack Developer (aplica Junior, Semi y Senior — todos los niveles) |
| Years | 2+ |
| Logros | Ganador Hackathon Colombia 5.0 (regional Bucaramanga, MinTIC). Autor open-source npm: OmniCoder CLI + Claude MiniMax Kit. Cofundador Tikno Studio. Tesis SSL imágenes médicas (asesoría KAUST) |
| Education | 7° semestre Ing. Sistemas — Universidad Autónoma de Bucaramanga (UNAB) |
| Certs | 5x AWS Academy (Cloud Foundations, Architecting, Developing, Data Engineering, ML), Python Cisco |
| English | B1 intermedio (NO aplicar a ofertas que exijan B2/C1/fluent excluyente) |
| City | Bucaramanga, Colombia |

## Stack to highlight

- **Backend**: Python (Django, Flask), Node.js (NestJS, Express), TypeScript, REST APIs, GraphQL
- **Frontend**: React, Next.js, Vue, TailwindCSS
- **Data**: PostgreSQL, MongoDB, Redis
- **DevOps**: Docker, Git, GitHub Actions CI/CD, AWS (EC2/Lambda/ECS/S3), Linux
- **Automatización**: n8n, integraciones APIs, WhatsApp Business API
- **AI/LLM**: OpenAI/Anthropic APIs, RAG básico

## Workflow (5 phases)

### Phase 0 — Telegram public channels (FUENTE PRIMARIA — más volumen que LinkedIn, SIN login)

Los canales públicos de Telegram de empleos IT se leen vía `https://t.me/s/<canal>` **sin necesidad de login** y tienen muchos más posts con email de recruiter que LinkedIn (2026). **Empezar SIEMPRE por aquí.**

Canales confirmados (rotar / revisar los 3):
- `https://t.me/s/remotejobscol` — Ofertas para Devs en Colombia (el mejor)
- `https://t.me/s/empleostech` — Empleos Tech remoto LATAM
- `https://t.me/s/empleo_it_latam` — IT LATAM

Extracción (Playwright, sin login):
1. Navegar al canal, `window.scrollTo(0, document.body.scrollHeight)` (los mensajes recientes cargan abajo). Para días anteriores, scroll hacia arriba carga más antiguos.
2. Por cada `.tgme_widget_message`: texto en `.tgme_widget_message_text`, fecha en `time[datetime]`.
3. Regex email sobre el texto. Filtrar igual que LinkedIn: remoto (o presencial SOLO Bucaramanga), stack agnóstico (Python/Node/TS/React/Django/Nest/PHP-Laravel + Java/Spring, C#/.NET, Go), no-duplicado por `email+cargo` (mismo reclutador con un puesto DISTINTO sí se permite; solo se salta si es el mismo email + mismo cargo), todos los niveles (junior/semi/senior), no inglés B2/C1 excluyente.
4. Para "1-2 días atrás": filtrar por `datetime` reciente (post_age_days ≤ 2).

### Phase 1 — LinkedIn search (Playwright, sesión ya logueada)

Use `mcp__playwright__browser_*` tools. **Rotate the queries each run** so we don't hit the same posts:

```
"envía tu CV al correo" desarrollador
"envía tu hoja de vida a" backend remoto
"interesados enviar CV a" programador
"estamos contratando" desarrollador junior cv@
"buscamos programador" rrhh@
"send your CV to" python remote latam
"hiring" backend developer remote cv@
```

Navigate to:
```
https://www.linkedin.com/search/results/content/?keywords=<URL-encoded query>&datePosted=%22past-week%22&sortBy=%22date_posted%22
```

Filter `datePosted=past-week` so we only see posts ≤ 7 days old.

For each post visible:

1. Extract:
   - **Email**: regex `[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}` (first non-LinkedIn match)
   - **Company**: from the post header or signature
   - **Role / position**: from the post body
   - **Comments count**: visible in the post footer
   - **Reposts count**: visible in the post footer
   - **Post date / "hace N días"**
   - **Post URL**: from the timestamp link
2. **SKIP** if:
   - Email + MISMO cargo ya registrado en `/home/nicolas/job-hunter/results/linkedin_recruiter_emails.json` (mismo gmail con un cargo DISTINTO NO se salta: es vacante nueva)
   - Comments + reposts > 30 (high competition)
   - Post older than 7 days
   - Email domain is `.gov` / `.edu` (not recruiting)
   - Email is the OP's personal Gmail with no company context AND post has < 5 reactions (likely scammy)
   - Role mismatches stack hard (e.g. ABAP, COBOL only, Salesforce admin only, hardware-only)
   - (NO skip por seniority — se aplica a junior, semi y senior por igual)

3. **MANDATORY modalidad**: el post debe ser remoto (`\b(remoto|remote|teletrabajo|home office|100% remoto)\b`) **O** presencial/híbrido con sede en **Bucaramanga**. Presencial fuera de Bucaramanga (Bogotá, Medellín, Cali, etc.) → SKIP.

4. **PRIORITIZE** posts where:
   - Comments < 15 (less competition)
   - Posted < 48h ago (fresh)
   - Stack alignment: Python / Node / TS / React / Django / Nest / PHP-Laravel / Java-Spring / C#-.NET / Go (cualquier nivel)
   - Remote LATAM-friendly (Argentina, Colombia, Peru, Chile, Mexico, Honduras, Panamá, Uruguay)
   - Clear company domain (e.g. `@company.com` not `@gmail.com`)

### Phase 2 — Compose the email

**Subject template**:
```
Postulación: <Cargo específico> — Nicolás Santiago Moreno Monroy
```
(English): `Application: <Role> — Nicolás Santiago Moreno Monroy`

**Body structure** (Spanish default, English if post is in English):

```
Hola <Nombre del reclutador o "equipo de <Empresa>">,

Vi su publicación en LinkedIn buscando un/a <Rol> para <Empresa> y me interesa
postularme. <Frase específica de la empresa o del proyecto que conecte con tu
perfil — 1 línea>.

Sobre mí — soy Backend Developer & Systems Engineer con 2+ años de experiencia
construyendo APIs y servicios full-stack en producción, actualmente cursando 7°
semestre de Ingeniería de Sistemas en la Universidad Autónoma de Bucaramanga.

Lo que aporto al rol:

• Backend: Python (Django/Flask), Node.js (NestJS), TypeScript — APIs REST con
  JWT, validación, manejo de errores estandarizado, OpenAPI.
• Frontend: React, Next.js, TailwindCSS — interfaces production-ready integradas
  con backends propios.
• Cloud & DevOps: Docker, AWS (5 certificaciones AWS Academy: Architecting,
  Developing, Data Engineering, ML, Cloud Foundations), GitHub Actions CI/CD,
  PostgreSQL, MongoDB, Redis.
• Automatización & AI: n8n, integraciones APIs, OpenAI/Anthropic, WhatsApp
  Business API — pipelines que han reducido 80% el tiempo operativo en clientes.

<Frase opcional adaptada al stack del post — ej. "Tu requisito de NestJS +
PostgreSQL coincide con el core de mi último proyecto en Tikno Studio.">

Disponible para integrarme de manera inmediata, modalidad remota / horario
LATAM (UTC-5). Adjunto mi hoja de vida.

Quedo atento a su respuesta — gracias por considerar mi postulación.

Saludos,
Nicolás Santiago Moreno Monroy
Backend Developer & Systems Engineer
📧 nm5571762@gmail.com
📱 +57 350 232 8517
🔗 LinkedIn: https://www.linkedin.com/in/nicolas-moreno-dev
🐙 GitHub: https://github.com/nicolas2601
🌐 Portfolio: https://nicolasmoreno.site/
```

**Personalization rules** (mandatory):
- Replace `<Empresa>` with the actual company name from the post.
- Replace `<Rol>` with the actual role title from the post.
- Replace `<Nombre del reclutador>` if visible (e.g. "Hola María,") — otherwise `equipo de <Empresa>`.
- Add 1 line that mentions something specific the post said (sector, tech stack, mission). NEVER reuse the same hook line across companies.
- If the post is in English → translate the entire body to English; do not mix.
- If the post mentions specific tech (e.g. Symfony/PHP, Ruby/Rails, Java/Spring) → add a sentence acknowledging transferable experience honestly (don't fabricate seniority).

### Phase 3 — Send via Playwright (Gmail web)

**Send each email through the Gmail web UI driven by Playwright** — this is the only supported channel. Do NOT use SMTP. The user wants every send to appear in their Sent folder as if they typed it manually, with the PDF CV attached.

Pre-flight:
- Confirm the active tab is logged in to `mail.google.com` for `nm5571762@gmail.com`. If redirected to login, **stop and ask the user** to authenticate.
- Confirm `/home/nicolas/cv/CV_Nicolas_Moreno_v5_ATS.pdf (ES) o _v5_EN.pdf (EN segun idioma)` exists.

Loop per recipient (one at a time, sequential):

1. Navigate to `https://mail.google.com/mail/u/0/#inbox` (or stay there if already loaded).
2. Click **Compose** button (`div[role=button][gh="cm"]`, or text "Redactar" / "Compose").
3. In the compose dialog:
   - Fill **To** (`textarea[name="to"]` or `input[role=combobox][aria-label*="Destinatarios"]`) with `entry.email` and press `Tab` to commit the chip.
   - Fill **Subject** (`input[name="subjectbox"]`) with `entry.subject`.
   - Fill **Body** (`div[role="textbox"][aria-label*="cuerpo"]` / `Message Body`) with `entry.body` (use `browser_type` so newlines and accents are preserved — set `slowly: false`).
   - Click the **Attach files** paperclip (`[command="+JWZqf"]` or `div[role=button][aria-label*="Adjuntar"]`).
   - Use Playwright's file chooser handler to attach `/home/nicolas/cv/CV_Nicolas_Moreno_v5_ATS.pdf (ES) o _v5_EN.pdf (EN segun idioma)`.
   - Wait for the attachment chip to render (text contains `CV_Nicolas_Moreno_v5` and `100%` upload complete).
4. Click **Send** (`div[role=button][aria-label*="Enviar"]` / `Send`, also keyboard `Ctrl+Enter`).
5. Wait for the toast `Mensaje enviado` / `Message sent` (success signal).
6. **Immediately update** `linkedin_recruiter_emails.json` with the entry (status `sent`, timestamp, etc.).
7. Sleep **30–60 seconds** before the next compose (rotate randomly).

If Send fails (no toast within 15s, or error banner): log the entry with `status: error` + `error: <message>` and proceed to the next recipient. Never retry the same recipient automatically.

**Hard checks before clicking Send**:
- The Subject is non-empty.
- The Body contains the recipient's company name (anti-mismatch guard against template-mix-ups).
- The attachment chip shows `CV_Nicolas_Moreno_v5`.
- The To field shows exactly the intended email (single recipient — no BCC).

Optional helper: `/home/nicolas/job-hunter/linkedin_email_send.py` is kept as a **log-only utility** (`--log-only` mode) — you can pipe completed sends into it to update the JSON log atomically, but it must NOT be used for the actual send.

### Phase 4 — Log

Append every send (success **or** error) to `/home/nicolas/job-hunter/results/linkedin_recruiter_emails.json`:

```json
[
  {
    "email": "recursoshumanoshn2016@gmail.com",
    "company": "COOPERATIVA FINACOOP",
    "role": "Programador Junior",
    "linkedin_url": "https://www.linkedin.com/posts/...",
    "comments_count": 21,
    "reposts_count": 14,
    "post_age_days": 2,
    "sent_at": "2026-05-01T15:30:00-05:00",
    "language": "es",
    "subject": "Postulación: Programador Junior — Nicolás Santiago Moreno Monroy",
    "status": "sent",
    "error": null
  }
]
```

Also create / update the daily round file:
`/home/nicolas/job-hunter/results/applications_log_YYYYMMDD.md`

### Phase 5 — Memory + final report

Call `mcp__engram__mem_save`:
- title: `LinkedIn email round YYYY-MM-DD: N sent`
- type: `manual`
- content: list of {email, company, role}, skipped reasons, errors

Tell the user (concise):
- ✅ Emails sent: N (list companies + roles)
- ⏭️ Skipped: M (duplicates, high competition, expired, mismatch)
- ❌ Errors: K (with reasons)
- 📂 Log file path

## Hard rules (non-negotiable)

1. **Dedup by `email+role`, never by email alone.** The same recruiter gmail posts different jobs — a previously-contacted address is NOT a reason to skip. Only skip when the same email was already contacted for the SAME role. Always check the log first, but compare role too.
2. **NEVER** send more than 10 emails per session (Gmail rate limit safety).
3. **NEVER** use BCC. Each email is individual, addressed personally.
4. **NEVER** fabricate years of experience, certifications, or technologies.
5. **ALWAYS** attach `/home/nicolas/cv/CV_Nicolas_Moreno_v5_ATS.pdf (ES) o _v5_EN.pdf (EN segun idioma)`.
6. **ALWAYS** sleep 30–60s between sends.
7. **ALWAYS** log every attempt (success or failure) before moving on.
8. **NEVER** print the SMTP app password to the user or to logs.
9. If LinkedIn session expired, ask the user to log in manually — never scrape unauthenticated.
10. If the post requires English → entire email in English, no Spanglish.

## Anti-patterns

- Mass sends with CCO/BCC (forbidden — was an explicit feedback in feedback_email_recruiter_format.md)
- Generic greeting "Estimados Sres." with no company name
- Reusing the exact same body across companies (hooks must vary)
- Subject = "Solicitud de empleo" (boring, low signal)
- Sending to gmail addresses with no signal of legitimacy (likely scams or talent sourcers)
- Applying to posts older than 7 days (cold)
- Applying to posts with > 30 comments (high competition)

## Handoff Checklist (must verify before saying "done")

- [ ] At least 3 LinkedIn search queries executed
- [ ] All viable posts screened against the log (no duplicates)
- [ ] Each viable email composed with company-specific hook
- [ ] CV attached on every send
- [ ] Per-send sleep 30–60s
- [ ] `linkedin_recruiter_emails.json` updated with every attempt
- [ ] `applications_log_YYYYMMDD.md` created
- [ ] `mem_save` called with the round summary
- [ ] User reported: sent / skipped / errors

## Cross-reference

- See `feedback_email_recruiter_format.md` (memory) for the lesson learned on individual emails (NEVER CCO/BCC).
- See `project_jobhunter*.md` (memory) for accumulated history (~91+ applications since March).
- Sister command: `/job-apply` (GetOnBoard + Computrabajo + Torre + LinkedIn) — this skill is the LinkedIn-email-only specialization.
