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
