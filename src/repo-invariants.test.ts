import { test, expect } from "bun:test"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

/**
 * T047/AC-8: this is a public repo — a hardcoded local-machine username must never leak
 * into any shipped source (doc comments, fixtures, path examples). A regression-guard
 * test, not new-behaviour TDD: by this point in the sequence every path derivation went
 * through `memoryDir`/`projectSlug`, never a hardcoded literal, so this is EXPECTED to
 * already pass. If it fails, the failure output below names the offending file — fix
 * that file, not this test. The forbidden literal is assembled at runtime (never spelled
 * out in this file's own source) so this scan can never accidentally flag itself.
 */
const FORBIDDEN = ["nic", "olas"].join("")

function walk(dir: string, out: string[] = []): string[] {
  let names: string[] = []
  try {
    names = readdirSync(dir)
  } catch {
    return out
  }
  for (const name of names) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

test(`repo invariant: forbidden local-username literal never appears under gate/, src/, scripts/ (AC-8)`, () => {
  const dirs = ["gate", "src", "scripts"].map((d) => join(ROOT, d))
  const pattern = new RegExp(FORBIDDEN, "i")
  const offenders: string[] = []
  for (const dir of dirs) {
    for (const file of walk(dir)) {
      const content = readFileSync(file, "utf8")
      if (pattern.test(content)) offenders.push(file)
    }
  }
  expect(offenders).toEqual([])
})
