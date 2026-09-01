import { test, expect } from "bun:test"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

test("install.ps1 is ASCII-only for Windows PowerShell 5.1 parsing", () => {
  const bytes = readFileSync(join(ROOT, "install.ps1"))
  const nonAscii = [...bytes.entries()].filter(([, byte]) => byte > 0x7f)

  expect(nonAscii).toEqual([])
})
