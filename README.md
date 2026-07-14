# router-skills

[![CI](https://github.com/nicolas2601/router-skills/actions/workflows/ci.yml/badge.svg)](https://github.com/nicolas2601/router-skills/actions/workflows/ci.yml)
![Platforms](https://img.shields.io/badge/platforms-linux%20%7C%20macOS%20%7C%20windows-blue)
![Runtime](https://img.shields.io/badge/runtime-bun-black)
![License](https://img.shields.io/badge/license-MIT-green)

**One command that makes [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and
[opencode](https://opencode.ai) actually use their Agent Skills on every turn — and think
like a senior engineer while doing it.**

Works on **Linux, macOS, and Windows**. Safe to re-run. Backs up everything it touches.
Never overwrites a config it can't parse.

---

## Table of contents

- [What is this?](#what-is-this)
- [What you get](#what-you-get)
- [Requirements](#requirements)
- [Install](#install)
- [How the skill gate works](#how-the-skill-gate-works)
- [The FABLE mindset protocol](#the-fable-mindset-protocol)
- [What gets written where](#what-gets-written-where)
- [Command reference](#command-reference)
- [Verify your install](#verify-your-install)
- [Uninstall](#uninstall)
- [Troubleshooting](#troubleshooting)
- [Safety guarantees](#safety-guarantees)
- [Skill pack & agent pack](#skill-pack--agent-pack)
- [For contributors](#for-contributors)
- [License](#license)

---

## What is this?

Claude Code and opencode both support **Agent Skills** (reusable `SKILL.md` playbooks) and
**sub-agents**. In practice the model reaches for them inconsistently — or forgets they
exist — and just starts coding. A plain reminder in your config is only *advice*: the model
reads it, name-drops a skill, and skips it anyway.

**router-skills installs a real enforcement layer** into both tools:

1. A **skill gate** that scores your prompt against your whole skill catalog and *blocks*
   the turn from finishing until the genuinely-relevant skills are actually loaded.
2. A portable **engineering-mindset protocol** ("FABLE") dropped into the global rules of
   each tool, so every session reasons with the same discipline — evidence over opinion,
   root-cause over symptom, and resistance to prompt-injection from pasted content.
3. A bundled **skill pack** and **agent pack**, linked in so both tools share one source.

You run it once; both harnesses behave better in every project afterward.

## What you get

| | Before | After router-skills |
|---|---|---|
| **Skill use** | occasional, habit-driven | scored per prompt, **required skills blocked until loaded** |
| **Non-English prompts** | scored against English descriptions — mostly noise | Spanish vocabulary expanded into the terms skills actually use |
| **Reasoning** | varies by session | consistent FABLE protocol in every session |
| **Prompt injection** | pasted "ignore previous instructions" sometimes obeyed | content treated as data, embedded commands surfaced not obeyed |
| **Skills/agents** | whatever you set up per-tool | one bundled pack shared by both tools |
| **Token cost** | unbounded bash/MCP output, defaults everywhere | verified caps + compaction — without disabling skills or reasoning |
| **Config safety** | manual edits, easy to clobber | backups + strict-JSON-only writes + idempotent re-runs |

## Requirements

- **git** on your PATH — the only hard prerequisite (used to clone/update).
- **[bun](https://bun.sh)** — the installer runs on it. **You don't need to install it
  yourself**: if it's missing, the one-liner installs it for you.
- **A JS runtime for the hooks** — `node` *or* `bun`. The installer detects which one you
  have and wires the hooks to use it (so a bun-only machine works too), and warns you if
  neither is present.

At least one of **Claude Code** or **opencode** must be installed — router-skills detects
which and only configures what's there.

## Install

### One command

**Linux / macOS**

```bash
curl -fsSL https://raw.githubusercontent.com/nicolas2601/router-skills/main/install.sh | bash
```

**Windows (PowerShell)**

```powershell
irm https://raw.githubusercontent.com/nicolas2601/router-skills/main/install.ps1 | iex
```

> Two scripts, one for each shell — `curl | bash` and `irm | iex` are different worlds, so
> like bun/deno/rustup there's one bootstrap per OS. Both do the same thing: clone into
> `~/.router-skills`, install bun if needed, and run the provisioner.

**Piped installs run non-interactively.** With no terminal to prompt in, the installer
configures every detected tool with sensible defaults. Want to choose? Run it in a terminal
(next section) or pass flags.

### From a checkout (interactive TUI)

```bash
git clone https://github.com/nicolas2601/router-skills.git
cd router-skills && bun install

bun run start        # interactive menu — pick tools, skills, agents, mindset
bun run dry          # preview everything, write nothing
bun run install:all  # configure everything detected, no prompts
```

### Prebuilt binary (no bun/git needed to run)

Download `router-skills`, `router-skills.exe`, or `router-skills-macos` from
[Releases](https://github.com/nicolas2601/router-skills/releases) (built by CI on every
`v*` tag). The binary is self-contained for **enforcement** (hook + plugin are inlined). To
also link the bundled skill/agent packs, run it from a checkout or point it at them:

```bash
ROUTER_SKILLS_DIR=/path/to/skills ROUTER_AGENTS_DIR=/path/to/agents ./router-skills --yes
```

> **Restart Claude Code / opencode after installing** so the new hooks and plugin load.

## How the skill gate works

A deterministic scorer (no LLM, no network, no API key) tokenizes your prompt and matches
it against your cached skill index, then splits the matches:

- **REQUIRED** — strong matches. The gate **blocks** until each is loaded:
  - *Claude Code*: a `Stop` hook refuses to end the turn.
  - *opencode*: the first work tool (`write` / `edit` / `bash`) throws until they're loaded.
- **SUGGESTED** — complementary matches (uncapped). Encouraged, never blocked — if five
  skills genuinely help, all five are surfaced.

Ambient/meta words (`claude`, `code`, `github`, a pasted URL…) are down-weighted so a link
or a meta-prompt never force-blocks on an irrelevant skill. The strongest matches are also
**auto-injected** — their `SKILL.md` bodies inlined into context as a knowledge floor.

Everything **fails open**: any hook or plugin crash is swallowed so it can never block your
prompt or break a session.

### One scorer, both tools

`gate/core/router-core.mjs` is the **only** scorer in the repo. Claude Code's hooks import
it; the opencode plugin has it **inlined at build time** by `scripts/gen-templates.mjs`.

That is not a stylistic choice. There used to be a hand-copied second scorer in the plugin,
and it had already drifted — its stopword list was missing the accented `también`, which
silently promoted a *suggested* skill to *required* on the opencode side only. A
`bun run gen --check` guard now fails CI if the generated plugin falls out of sync with the
source, so a drifted copy cannot come back.

### Matching is whole-word, and bilingual

**Whole words, not substrings.** Substring matching looks harmless until a short token in
your language is a substring of an unrelated English word. The Spanish `mal` ("bad") lives
inside deci**mal**, nor**mal**, for**mal**, ani**mal** — so a prompt about animations was
*mandating* a smart-contract decimals skill. Matching is anchored to word boundaries, with
a Latin-1/Latin-Extended word class (JS `\b` is ASCII-only and splits on accents).

**Spanish prompts are expanded into English terms.** Skill descriptions are written in
English. A Spanish prompt shares almost no tokens with them, so noise used to win outright
— measured on a real 1307-skill index, five out of five Spanish prompts routed to something
unrelated (`revisar la seguridad de este endpoint` → `graphql`). `gate/core/lexicon.mjs`
maps common development vocabulary (`seguridad`→`security`, `pruebas`→`test`,
`consulta`→`query`, `rendimiento`→`performance`, …) so the prompt and the index finally
share words.

Original tokens are always kept, so **English prompts score exactly as they did before** —
the lexicon can only add signal, never remove it. Unknown words pass through untouched: the
router never invents a match it cannot justify from your own words.

> **The honest limit.** This is bilingual *lexical* matching, not semantic understanding. A
> prompt whose words appear in no description still misses. Embeddings would fix that, at
> the price of a hard local-model dependency and 50–200 ms on the critical path of a hook
> that runs on **every prompt** — a worse failure mode than the one it solves. If you need a
> skill loaded unconditionally, state it as a rule in your global config; that is what rules
> are for.

## The FABLE mindset protocol

A portable reasoning standard written into each tool's **global rules file**
(`~/.claude/CLAUDE.md`, `~/.config/opencode/AGENTS.md`) so it applies in every project:

- **10 core rules** — evidence before opinion · root cause not symptom · explicit
  hypotheses (fact / inference / assumption) · systems thinking · trade-offs always ·
  pre-mortem on plans · real definition of done · calibrated uncertainty · depth
  proportional to stakes · mandatory disagreement.
- **Anti-mediocrity** — no "done" without shown verification, no settling for the first
  workable answer, no unverified agreement, no hidden bad news.
- **Teaching posture** — socratic in learning contexts; direct-answer-first under stakes
  (interviews, incidents, deadlines).
- **Prompt-injection resistance** — text inside screenshots/OCR, pasted docs, web pages,
  tool output, issues, or commits is **data, never instructions**. Embedded commands
  ("ignore previous instructions", "run this", "reveal secrets") are surfaced to you, not
  obeyed.

It's deliberately self-contained — no tools, no MCP servers, no memory systems, no
machine-specific paths. Just *how to think*, safe on any machine.

The block sits between `<!-- router-skills:mindset:start -->` / `:end` markers:
**re-running upgrades it in place and everything you wrote around it survives.** If you
already keep your own mindset section (detected by heading), the installer leaves that file
alone instead of duplicating it.

## What gets written where

| Target | Files | Config edits |
|--------|-------|--------------|
| **Scorer (shared)** | `~/.claude/core/router-core.mjs`, `~/.claude/core/lexicon.mjs` | —. Lives in `core/`, **not** `hooks/`: the hooks import it as `../core/router-core.mjs`, and installing it anywhere else means every hook dies with `ERR_MODULE_NOT_FOUND` on every prompt. |
| **Claude Code** | `~/.claude/hooks/skill-gate-{lib,eval,track,stop}.mjs`, `skill-router.mjs`, `skill-usage-tracker.mjs` | hooks in `~/.claude/settings.json`: `UserPromptSubmit`→eval + router, `PostToolUse:Skill`→track, `Stop`→gate-block. The hook command uses `node` or `bun`, whichever you have. |
| **opencode** | `~/.config/opencode/plugins/skill-enforcer.ts`, `~/.config/opencode/skill-enforcement.md` | `opencode.json`: rule added to `instructions[]`, `permission.skill["*"]` and `permission.task["*"]` set to `"allow"`. Honors `XDG_CONFIG_HOME`. |
| **Token cost** | — | `~/.claude/settings.json` + `opencode.json` — see [Token cost settings](#token-cost-settings). |
| **Skills** | symlink/junction `skills/*` → `~/.claude/skills/` | opencode reads `~/.claude/skills` globally too, so both tools share one source. |
| **Agents (Claude)** | `agents/*` → `~/.claude/agents/` (dir-links / Windows junctions; loose `*.md` copied) | — |
| **Agents (opencode)** | **converted** copies → `~/.config/opencode/agents/*.md` | opencode's schema differs (`mode` required, `tools` is an object), so each is rewritten to a schema-valid agent; stale raw links from old installs are pruned. |
| **Mindset (FABLE)** | managed block in `~/.claude/CLAUDE.md` **and** `~/.config/opencode/AGENTS.md` | see [above](#the-fable-mindset-protocol). |

Every JSON file is backed up as `<file>.bak.<timestamp>` before it's touched. Re-running is
safe: applied steps are detected and skipped, and the run ends with a health summary +
next-steps.

## Token cost settings

The installer also writes a small set of settings that cut token **cost** without cutting
token-funded **capability**. Every key was verified against the Claude Code bundle and the
opencode config docs — not against blog posts.

**Claude Code** (`~/.claude/settings.json`)

| Key | Value | Why |
|---|---|---|
| `env.BASH_MAX_OUTPUT_LENGTH` | `20000` | A noisy build log or test run is one of two unbounded sources of context — it can dump tens of thousands of tokens into a single turn. |
| `env.MAX_MCP_OUTPUT_TOKENS` | `10000` | The other one. A chatty MCP tool result defaults to a far higher cap. |
| `env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | `1` | Drops telemetry and survey round-trips. |
| `autoCompactEnabled` | `true` | Written explicitly so the intent survives a settings reset. |
| `cleanupPeriodDays` | `20` | Bounded session-transcript retention. |

**opencode** (`opencode.json`)

| Key | Value | Why |
|---|---|---|
| `compaction.auto` | `true` | Compact the session when context fills. |
| `compaction.prune` | `true` | Drops aged tool outputs. The biggest opencode-side win: tool results dominate a long session and old ones are almost never read again. |

### What this deliberately does NOT set

The cost-saving config that circulates online sets `disableBundledSkills`,
`disableWorkflows`, `disableAllHooks`, `effortLevel: "low"` and `MAX_THINKING_TOKENS: 0`.

Those do cut the bill — by disabling the reasoning and the skill system the bill is buying.
That is not optimization, it is amputation. **A test in this repo fails if any of those keys
ever appear in the installer's output.**

### The savings that are not a setting

Before you tune a single knob, measure where your tokens actually go. The fixed per-turn
toll of your global rules file is paid on **every turn**, whether the session is two
messages or two hundred:

- A global `CLAUDE.md` that inlines a catalogue of agents **the harness already injects for
  you** is paying twice for the same list. Removing one such catalogue cut ~2,300 tokens per
  turn — more than every env knob above combined.
- A memory index that lists your installed skills duplicates what the harness already puts
  in context, and goes stale the moment you install another one.

Grep your own config for anything the tool already tells the model. That is where the tokens
are.

### Never overwritten

Every key is filled **only if missing**. A value you set explicitly — even a more expensive
one — is yours and stays. That is what makes the step idempotent and safe to re-run on every
machine.

## Command reference

Run these from a checkout as `bun run src/index.ts <flag>`, or on the installed binary as
`router-skills <flag>`:

| Flag | Does |
|------|------|
| *(none)* | Interactive TUI — choose tools, skills, agents, mindset. Falls back to non-interactive when there's no terminal (piped install). |
| `--yes`, `-y` | Configure every detected tool with defaults, no prompts. |
| `--dry-run`, `-n` | Show exactly what would change; write nothing. |
| `--verify`, `-v` | Read-only health audit; exits non-zero if anything's off. |
| `--help`, `-h` | Usage. |

## Verify your install

```bash
router-skills --verify
```

Read-only. Checks: the gate hook files + settings wiring, the opencode plugin + rule +
config, linked skill/agent counts, that converted opencode agents are schema-valid
(`mode: subagent`), and that the FABLE mindset block is present in both global rules files.
Non-zero exit if any check fails — re-run `router-skills` to repair.

## Uninstall

router-skills is additive and reversible:

1. **Restore configs** — each edited `settings.json` / `opencode.json` /
   `CLAUDE.md` / `AGENTS.md` has a `*.bak.<timestamp>` next to it; restore the latest.
2. **Remove hooks/plugin** — delete `~/.claude/hooks/skill-gate-*.mjs`,
   `~/.claude/hooks/skill-router.mjs`, `~/.claude/hooks/skill-usage-tracker.mjs`,
   `~/.claude/core/` (the shared scorer + lexicon),
   `~/.config/opencode/plugins/skill-enforcer.ts`, and
   `~/.config/opencode/skill-enforcement.md`.
3. **Unlink packs** (optional) — remove the `skills/*` and `agents/*` links from
   `~/.claude/skills` / `~/.claude/agents` and `~/.config/opencode/agents`.
4. **Mindset block** — delete the text between the
   `<!-- router-skills:mindset:start -->` / `:end` markers.
5. **The repo itself** — `rm -rf ~/.router-skills`.

Restart both tools afterward.

## Troubleshooting

**Nothing enforces after install.**
Restart Claude Code / opencode — hooks and plugins load at session start.

**`ERR_MODULE_NOT_FOUND: Cannot find module '.../.claude/core/router-core.mjs'` on every prompt.**
The hooks import the shared scorer as `../core/router-core.mjs`, so it must live in
`~/.claude/core/` — **not** next to them in `~/.claude/hooks/`. If you upgraded from a build
that installed it flat, delete the stray `~/.claude/hooks/router-core.mjs` and re-run
`router-skills`. Both `router-core.mjs` and `lexicon.mjs` must be present in `core/`.

**The router suggests skills that have nothing to do with my prompt.**
Scoring is lexical, not semantic — it matches the words you actually typed against the words
in each `SKILL.md` description. If your prompt and the description share no vocabulary, the
match will be poor. Spanish prompts are expanded into English terms via
`gate/core/lexicon.mjs`; add a mapping there if a term you use often is missing. For a skill
that must load regardless of wording, state it as a rule in your global config instead — a
scorer is the wrong tool for an unconditional requirement.

**"neither node nor bun found on PATH — hooks will not run" during install.**
The gate hooks are `.mjs` and need a JS runtime. Install [node](https://nodejs.org) or
ensure `bun` is on PATH, then re-run `router-skills`.

**opencode changes seem to go nowhere (Windows or custom setups).**
opencode reads config from `$XDG_CONFIG_HOME/opencode` when that env var is set, otherwise
`~/.config/opencode` (on every OS — it does **not** use `%APPDATA%`). router-skills follows
the same rule. If you set `XDG_CONFIG_HOME`, make sure the same value is set when you run
both opencode and the installer.

**"settings.json left untouched — wire manually".**
Your config has comments/trailing commas (jsonc) or didn't parse. router-skills only
rewrites strict JSON so it can't corrupt a hand-edited file. Either convert it to strict
JSON and re-run, or add the 3 hooks / `instructions[]` entry by hand (the message tells you
which).

**Some skills "FAILED to link (check permissions)".**
A junction couldn't be created (locked folder, antivirus, or a cross-volume path). On
Windows, keep `~/.router-skills` and `~/.claude` on the same drive; re-run after closing
anything holding the target folder.

**The `curl | bash` one-liner hung before.**
Fixed — piped installs now detect the missing terminal and run non-interactively instead of
waiting on a prompt.

## Safety guarantees

- **No config clobber.** `settings.json` / `opencode.json` is rewritten **only** when it's
  strict JSON. jsonc or unreadable → left untouched, with a note to wire that step by hand.
- **No junk skills.** Skills without valid `SKILL.md` frontmatter are skipped and reported
  (BOM- and CRLF-aware), so neither tool logs parse errors at startup.
- **Fail-open enforcement.** Hooks and plugin are wrapped — a crash never blocks your prompt.
- **Backups before every mutation**, and stale-link pruning only removes links that resolve
  back into this repo's pack — never your own files.
- **Failures are surfaced, not hidden.** A link that can't be created is counted and shown,
  not silently dropped.

## Skill pack & agent pack

- **`skills/`** — the bundled skill pack; one directory per skill, each with a `SKILL.md`.
  This is the single source of truth; `~/.claude/skills` entries link back to it. Add/remove
  folders here; `bun run validate` enforces valid frontmatter and no build junk.
- **`agents/`** — the bundled sub-agent pack, organized by category (`engineering/`,
  `design/`, `testing/`, …) plus an `opencode/` folder for opencode-native agents. Claude
  Code gets the raw pack linked; opencode gets schema-valid converted copies.

**Using the agents in opencode:**
- *Manually* — `@agent-name` in a message (works even if task permissions deny it).
- *Automatically* — a primary agent delegates via the **Task tool** based on each agent's
  `description`. The installer enables this globally (`permission.task["*"] = "allow"`); a
  per-agent `permission.task` you set yourself (e.g. an orchestrator with `{"*": "deny"}`)
  is respected and never overwritten.

**Detected but not configured:** Cursor, Gemini CLI, Windsurf, aider — reported but skipped;
they don't use the global `SKILL.md` discovery model.

## For contributors

```bash
bun install
bun run typecheck   # tsc --noEmit (strict: noUnusedLocals/Parameters)
bun run validate    # skill + agent pack integrity gate
bun run test        # pure-logic tests (paths, runner pick, XDG, upsert, conversion…)
bun run gen         # regenerate src/templates.ts from the gate/ sources
bun run build       # regen + compile linux/windows/macos binaries into dist/
```

**Project layout:**

```
install.sh / install.ps1   one-command bootstraps (per OS)
gate/                      hook + plugin sources — EDIT THESE
  claude/  skill-gate-{lib,eval,track,stop}.mjs
  opencode/ skill-enforcer.ts, skill-enforcement.md
src/
  index.ts                 TUI + orchestration
  detect.ts                which tools are installed
  paths.ts                 pure path builders (XDG-aware, win-tested)
  util.ts                  fs helpers, runtime detection, cross-runtime PATH scan
  templates.ts             AUTO-GENERATED from gate/ (do not hand-edit)
  mindset-template.ts      FABLE protocol text (hand-maintained)
  verify.ts                read-only health audit
  installers/              claude · opencode · skills · agents · mindset
skills/                    bundled skill pack (source of truth)
agents/                    bundled agent pack (by category)
```

> The hook/plugin sources live in `gate/` and are inlined into `src/templates.ts` for the
> compiled binary. **Edit `gate/`, then run `bun run gen`** — never edit `templates.ts` by
> hand. The FABLE text is the exception: it lives in `src/mindset-template.ts`.

**Cross-platform notes:**
- Hooks are `.mjs`, run by `node` or `bun` (whichever is present) — no bash dependency.
- Links are `dir` symlinks on posix, **junctions** on Windows (no admin / Developer Mode).
- Paths are built from `os.homedir()` and unit-tested for Windows via `path.win32`; CI runs
  the full suite on **ubuntu, windows, and macos** runners.

**CI / release:**
- `ci.yml` — typecheck + pack validation + tests on all three OSes, then cross-compiles all
  three binaries and smoke-tests the native one, on every push/PR.
- `release.yml` — on a `v*` tag: re-validate, build the three binaries, publish a GitHub
  Release with generated notes:
  ```bash
  git tag v0.6.0 && git push origin v0.6.0
  ```

## License

MIT
