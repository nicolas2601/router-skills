import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { resolve, join, dirname } from "node:path"

/** Repo root. util.ts lives in src/, so root is one level up. */
export const ROOT = resolve(import.meta.dir, "..")
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

/** Result of a defensive config read. `parsed` is false when the file exists but is unreadable. */
export type ConfigRead<T> = { existed: boolean; parsed: boolean; value: T }

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
  if (!existsSync(file)) return { existed: false, parsed: true, value: fallback }
  const raw = readFileSync(file, "utf8")
  try {
    return { existed: true, parsed: true, value: JSON.parse(raw) as T }
  } catch {
    try {
      return { existed: true, parsed: true, value: JSON.parse(stripJsonc(raw)) as T }
    } catch {
      return { existed: true, parsed: false, value: fallback }
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

/** True when `cmd` resolves on PATH. */
export function onPath(cmd: string): boolean {
  return Bun.which(cmd) !== null
}

export type Action = { label: string; done: boolean; detail?: string }
