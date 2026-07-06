# router-skills

[![CI](https://github.com/nicolas2601/router-skills/actions/workflows/ci.yml/badge.svg)](https://github.com/nicolas2601/router-skills/actions/workflows/ci.yml)
![Platforms](https://img.shields.io/badge/platforms-linux%20%7C%20macOS%20%7C%20windows-blue)
![Runtime](https://img.shields.io/badge/runtime-bun-black)
![License](https://img.shields.io/badge/license-MIT-green)

Force **Claude Code** and **opencode** to evaluate and use Agent Skills on every turn —
on **Linux, macOS, and Windows**. One TUI: detect the CLIs you have, install enforcement,
link a bundled skill pack, and convert a bundled agent pack. Idempotent, with backups, and
it never overwrites a config it can't safely parse.

## Why

Both harnesses ship skills but reach for them inconsistently (or never). router-skills
installs the proven *forced-eval* pattern: before each response the agent must scan the
catalog, pick the **most specific** skills, and activate them before acting — instead of
defaulting to the same few or skipping straight to code.

## Install

### One-liner

**Linux / macOS**

```bash
curl -fsSL https://raw.githubusercontent.com/nicolas2601/router-skills/main/install.sh | bash
```

**Windows (PowerShell)**

```powershell
irm https://raw.githubusercontent.com/nicolas2601/router-skills/main/install.ps1 | iex
```

Both clone into `~/.router-skills`, run `bun install`, and launch the TUI. Requires
[bun](https://bun.sh) + git on PATH.

### From source

```bash
git clone https://github.com/nicolas2601/router-skills.git
cd router-skills && bun install
bun run start          # interactive TUI
bun run dry            # preview, writes nothing
bun run install:all    # configure everything detected, no prompts
bun run src/index.ts --verify   # audit what's installed (read-only)
```

### Prebuilt binary

Grab `router-skills`, `router-skills.exe`, or `router-skills-macos` from
[Releases](https://github.com/nicolas2601/router-skills/releases) (built by CI on every
`v*` tag). The binary is self-contained for **enforcement** (hook + plugin templates are
inlined). To also link the bundled packs, run it from a repo checkout, or point it at them:

```bash
ROUTER_SKILLS_DIR=/path/to/skills ROUTER_AGENTS_DIR=/path/to/agents ./router-skills --yes
```

## What it installs

| Target | Enforcement | Config |
|--------|-------------|--------|
| Claude Code | `~/.claude/hooks/skill-forced-eval.mjs` (Node hook, runs on Win + posix) | wired into `~/.claude/settings.json` |
| opencode | `~/.config/opencode/plugins/skill-enforcer.ts` (`experimental.chat.system.transform`) **+** `skill-enforcement.md` registered in `instructions[]` | `permission.skill["*"] = "allow"` |
| Skills | links `skills/*` → `~/.claude/skills/` | opencode reads `~/.claude/skills` globally too, so both harnesses share one source |
| Agents (Claude) | links `agents/*` → `~/.claude/agents/` | category dirs are dir-symlinks / Windows junctions; loose root `*.md` copied |
| Agents (opencode) | **converts** each agent → `~/.config/opencode/agents/*.md` | opencode's schema differs (`mode` required, `tools` is an object not a comma-string), so raw links error — each is rewritten to a minimal valid opencode agent, and stale raw links from older installs are pruned |

Every JSON it touches is backed up as `<file>.bak.<timestamp>` first. Re-running is safe —
already-applied steps are detected and skipped.

## Safety guarantees

- **No config clobber.** A `settings.json` / `opencode.json` is rewritten **only** when it
  parses as strict JSON. If it's jsonc (comments / trailing commas) or unreadable, it's left
  untouched and you're told to wire that one step by hand — a lenient re-write would strip
  comments or persist a mis-parsed value.
- **No junk / broken skills.** Skills without a valid `SKILL.md` frontmatter are skipped and
  reported (BOM- and CRLF-aware), so neither harness logs parse errors at startup.
- **Fail-open enforcement.** The hook and plugin are wrapped so a crash can never block your
  prompt, and the plugin is idempotent (never double-injects the directive).
- **Backups before every mutation**, and stale-link pruning only removes symlinks that resolve
  back into this repo's pack — never your own files.

## Verify

```bash
router-skills --verify      # or: bun run src/index.ts --verify
```

Read-only audit — checks the hook, settings wiring, opencode plugin + rule + config, linked
skill/agent counts, and that opencode agents are schema-valid (`mode: subagent`). Exits
non-zero if any check fails.

## Skill pack

`skills/` holds the bundled pack. Each entry is a directory with a `SKILL.md`. This dir is the
single source of truth — `~/.claude/skills` entries link back to it. Add or remove skill
folders here; `bun run validate` enforces that every one has valid frontmatter and no build
junk is committed.

## Agent pack

`agents/` holds the bundled sub-agent pack, organised by category (`engineering/`, `design/`,
`testing/`, …) plus an `opencode/` folder for opencode-native agents. Each agent is a `.md`
file with YAML frontmatter. On install, Claude Code gets the raw pack linked into
`~/.claude/agents/`; opencode gets a **converted** copy (schema-valid `mode: subagent` agents)
in `~/.config/opencode/agents/`.

## Detected but not configured

Cursor, Gemini CLI, Windsurf, aider — detected and reported, but skipped: they don't use the
global `SKILL.md` discovery model.

## Cross-platform notes

- **Hook is Node, not bash** → works in Windows' shell (absolute path, no `~` expansion).
- **Links**: `dir` symlinks on posix, **junctions** on Windows (no admin / Developer Mode).
- **Paths** are built with `node:path` from `os.homedir()`; Windows path construction is
  unit-tested via `path.win32` (`bun test`), and CI runs the full suite on Windows and macOS
  runners too.

## Development

```bash
bun install
bun run typecheck   # tsc --noEmit (strict)
bun run validate    # skill + agent pack integrity gate
bun run test        # path + frontmatter + conversion tests
bun run build       # compile linux + windows + macos binaries into dist/
```

## CI / Release

- **CI** (`.github/workflows/ci.yml`) runs on every push and PR: typecheck + pack validation +
  tests on **ubuntu, windows, and macos**, then cross-compiles all three binaries and
  smoke-tests the native one.
- **Release** (`.github/workflows/release.yml`) runs on a `v*` tag: re-validates, builds the
  three binaries, and publishes them to a GitHub Release with generated notes.

  ```bash
  git tag v0.3.0 && git push origin v0.3.0
  ```

## After running

Restart Claude Code / opencode sessions so the hook and plugin load.

## License

MIT
