# router-skills

Force **Claude Code** and **opencode** to evaluate and use Agent Skills on every
turn — on **Linux, macOS, and Windows**. One TUI: detect the CLIs you have, install
enforcement, link a bundled skill pack. Idempotent, with backups.

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
```

### Prebuilt binary
Grab `router-skills`, `router-skills.exe`, or `router-skills-macos` from
[Releases](https://github.com/nicolas2601/router-skills/releases). The binary is
self-contained for **enforcement** (hook + plugin templates are inlined). To also link
the skill pack, run it from a repo checkout, or point it at a pack:
```bash
ROUTER_SKILLS_DIR=/path/to/skills ./router-skills --yes
```

## What it installs

| Target | Enforcement | Config |
|--------|-------------|--------|
| Claude Code | `~/.claude/hooks/skill-forced-eval.mjs` (Node hook, runs on Win+posix) | wired into `~/.claude/settings.json` |
| opencode | `~/.config/opencode/plugins/skill-enforcer.ts` (`experimental.chat.system.transform`) | `permission.skill["*"] = "allow"` in `opencode.json` |
| Skills | links `skills/*` → `~/.claude/skills/` | opencode reads `~/.claude/skills` globally too, so both harnesses share one source |

Every JSON it touches is backed up as `<file>.bak.<timestamp>` first. Re-running is
safe — already-applied steps are detected and skipped.

## Cross-platform notes

- **Hook is Node, not bash** → works in Windows' shell (no `~` expansion needed; absolute path).
- **Skill links**: `dir` symlinks on posix, **junctions** on Windows (no admin / Developer Mode needed).
- **Paths** built with `node:path` from `os.homedir()`; Windows path construction is unit-tested
  via `path.win32` (`bun test`), and the Windows binary is cross-compiled with `bun build --compile`.

## Skill pack

`skills/` holds the bundled pack. Add or remove skill folders here (each is a directory with
a `SKILL.md`). This dir is the single source of truth — `~/.claude/skills` entries link back to it.

## Detected but not configured

Cursor, Gemini CLI, Windsurf, aider — detected and reported, but skipped: they don't use the
global `SKILL.md` discovery model.

## After running

Restart Claude Code / opencode sessions so the hook and plugin load.

## Dev

```bash
bun test          # path + cross-platform tests
bun run build     # compile binaries for linux + windows + macos into dist/
```
