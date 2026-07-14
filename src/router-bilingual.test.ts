import { test, expect } from "bun:test"
import { expandQuery, scoreRouter } from "../gate/core/router-core.mjs"

/**
 * The router scores a Spanish prompt against English skill descriptions. Lexical overlap
 * is zero, so noise wins outright. Measured against the real 1307-skill index:
 *
 *   "revisar la seguridad de este endpoint"        -> graphql
 *   "escribir la documentacion del proyecto"       -> react-email
 *   "optimizar la consulta a la base de datos"     -> agent-payment-x402
 *
 * Five out of five wrong. Not "slightly off" — the router was useless in Spanish.
 *
 * The cause is language, not semantics, so the fix is a bilingual lexicon, not embeddings.
 * Embeddings would put a hard Ollama dependency and 50-200ms on the critical path of a
 * hook that runs on EVERY prompt, and buy nothing that the lexicon does not already buy.
 */

test("expandQuery maps Spanish dev vocabulary onto the English terms skills use", () => {
  expect(expandQuery(["animaciones"])).toContain("animation")
  expect(expandQuery(["seguridad"])).toContain("security")
  expect(expandQuery(["pruebas"])).toContain("test")
  expect(expandQuery(["rendimiento"])).toContain("performance")
  expect(expandQuery(["documentacion"])).toContain("documentation")
  expect(expandQuery(["base", "datos"])).toContain("database")
})

test("expandQuery keeps the original tokens — English prompts must not regress", () => {
  const out = expandQuery(["animation", "security"])
  expect(out).toContain("animation")
  expect(out).toContain("security")
})

test("expandQuery handles accents and plurals", () => {
  expect(expandQuery(["animación"])).toContain("animation")
  expect(expandQuery(["consultas"])).toContain("query")
  expect(expandQuery(["diseño"])).toContain("design")
})

test("expandQuery is a no-op for unknown words, never invents matches", () => {
  expect(expandQuery(["zurriburri"])).toEqual(["zurriburri"])
})

// --- The regression that matters: real routing on Spanish prompts. ---

const INDEX = [
  { name: "security-review", desc: "review code for security vulnerabilities in endpoints and apis" },
  { name: "graphql", desc: "graphql schema design and federation" },
  { name: "sql-optimization", desc: "optimize slow database queries and indexing strategies" },
  { name: "agent-payment-x402", desc: "autonomous agent payment rails" },
  { name: "technical-writer", desc: "write project documentation, api references and guides" },
  { name: "react-email", desc: "build transactional email templates with react" },
  { name: "e2e-testing", desc: "end to end tests for critical user flows like login" },
]

test.each([
  ["revisar la seguridad de este endpoint", "security-review", "graphql"],
  ["optimizar el rendimiento de la consulta a la base de datos", "sql-optimization", "agent-payment-x402"],
  ["escribir la documentacion del proyecto", "technical-writer", "react-email"],
  ["hacer pruebas end to end del login", "e2e-testing", "react-email"],
])("Spanish prompt %j routes to %s, not %s", (prompt, want, notWant) => {
  const top = scoreRouter(prompt, INDEX)[0]
  expect(top?.name).toBe(want)
  expect(top?.name).not.toBe(notWant)
})

test("an English prompt still routes correctly — the lexicon must not deafen it", () => {
  expect(scoreRouter("review security vulnerabilities", INDEX)[0].name).toBe("security-review")
})
