import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { resolve, join, dirname, delimiter } from "node:path"
import { fileURLToPath } from "node:url"

/** Repo root. util.ts lives in src/, so root is one level up. Cross-runtime:
 *  bun exposes import.meta.dir, node exposes import.meta.dirname. */
const HERE =
  (import.meta as any).dir ??
  (import.meta as any).dirname ??
  dirname(fileURLToPath(import.meta.url))
export const ROOT = resolve(HERE, "..")
/** Bundled skill pack. Overridable via ROUTER_SKILLS_DIR for compiled binaries. */
export const SKILLS = process.env.ROUTER_SKILLS_DIR ?? join(ROOT, "skills")
/** Bundled agent pack. Overridable via ROUTER_AGENTS_DIR for compiled binaries. */
export const AGENTS = process.env.ROUTER_AGENTS_DIR ?? join(ROOT, "agents")
export const HOME = homedir()

export const exists = (p: string) => existsSync(p)

export function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
}

/** Backup a file as <file>.bak.<timestamp> before mutating it. Returns backup path or null. */
export function backup(file: string): string | null {
  if (!existsSync(file)) return null
  const ts = new Date().toISOString().replace(/[:.]/g, "-")
  const bak = `${file}.bak.${ts}`
  copyFileSync(file, bak)
  return bak
}

export function readJSON<T = any>(file: string, fallback: T): T {
  if (!existsSync(file)) return fallback
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T
  } catch {
    return fallback
  }
}

/**
 * Result of a defensive config read.
 * - `parsed`: we obtained a usable object (strict JSON or lenient jsonc) — safe to READ.
 * - `strict`: strict `JSON.parse` succeeded — the ONLY case where it's safe to WRITE back
 *   (rewriting a jsonc file would strip comments, and lenient stripping can corrupt strings).
 */
export type ConfigRead<T> = { existed: boolean; parsed: boolean; strict: boolean; value: T }

/**
 * Best-effort JSONC → JSON: strip block/line comments and trailing commas.
 * `://` in URLs is preserved (a line comment must not be preceded by `:`).
 * Only used as a fallback when strict JSON.parse fails.
 */
function stripJsonc(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'\\])\/\/[^\n\r]*/g, "$1")
    .replace(/,(\s*[}\]])/g, "$1")
}

/**
 * Read a JSON/JSONC config defensively. Never throws.
 * - file absent            → { existed:false, parsed:true,  value: fallback }
 * - file present & valid   → { existed:true,  parsed:true,  value }
 * - file present & broken  → { existed:true,  parsed:false, value: fallback }
 *
 * Callers MUST check `existed && !parsed` and refuse to overwrite in that case,
 * so a hand-edited or jsonc config is never clobbered.
 */
export function readConfig<T = any>(file: string, fallback: T): ConfigRead<T> {
  if (!existsSync(file)) return { existed: false, parsed: true, strict: true, value: fallback }
  const raw = readFileSync(file, "utf8")
  try {
    return { existed: true, parsed: true, strict: true, value: JSON.parse(raw) as T }
  } catch {
    try {
      // Lenient read for inspection only — NOT strict, so callers must not write it back.
      return { existed: true, parsed: true, strict: false, value: JSON.parse(stripJsonc(raw)) as T }
    } catch {
      return { existed: true, parsed: false, strict: false, value: fallback }
    }
  }
}

export function writeJSON(file: string, data: unknown) {
  ensureDir(dirname(file))
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n")
}

export function readText(file: string): string {
  return readFileSync(file, "utf8")
}

export function writeText(file: string, content: string) {
  ensureDir(dirname(file))
  writeFileSync(file, content)
}

/**
 * Cross-runtime PATH lookup. Uses Bun's native resolver when available, else a manual
 * scan of process.env.PATH (with Windows PATHEXT). Never throws.
 * `pathSep`/`extList` are injectable so Windows resolution can be unit-tested on posix.
 */
export function whichSync(
  cmd: string,
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  sep: string = delimiter,
): string | null {
  const g = globalThis as any
  if (g.Bun?.which) {
    try {
      return g.Bun.which(cmd)
    } catch {
      /* fall through to manual scan */
    }
  }
  const dirs = (env.PATH ?? env.Path ?? "").split(sep).filter(Boolean)
  const isWin = platform === "win32"
  const exts = isWin ? (env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean) : [""]
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = join(dir, cmd + (isWin && !cmd.toLowerCase().endsWith(ext.toLowerCase()) ? ext : ""))
      try {
        if (existsSync(candidate)) return candidate
      } catch {
        /* unreadable dir — skip */
      }
    }
  }
  return null
}

/** True when `cmd` resolves on PATH (cross-runtime, no Bun dependency). */
export function onPath(cmd: string): boolean {
  return whichSync(cmd) !== null
}

/**
 * Pure runner picker for the Claude Code hooks (`.mjs`). The hooks run under whichever
 * JS runtime the wired command names, so we must name one that actually exists on the
 * user's PATH. Prefer `node` (ubiquitous, fast startup); fall back to `bun` (guaranteed
 * present because the bootstrap installs it). Never emit a runner that isn't installed —
 * that is exactly the Windows failure where hooks silently no-op.
 */
export function pickRunner(hasNode: boolean, hasBun: boolean): "node" | "bun" {
  if (hasNode) return "node"
  if (hasBun) return "bun"
  return "node" // nothing detected: node is the safest default to name (see install warning)
}

/** Resolve the runtime that should execute the hooks on THIS machine. */
export function hookRunner(): "node" | "bun" {
  return pickRunner(onPath("node"), onPath("bun"))
}

/** Shell command that runs a hook script with the best available runtime. */
export function hookCommand(scriptPath: string): string {
  return `${hookRunner()} "${scriptPath}"`
}

/** True only when both stdin and stdout are interactive TTYs — clack prompts need this. */
export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY)
}

export type Action = { label: string; done: boolean; detail?: string }
