import { test, expect } from "bun:test"
import { tokenize, scoreRouter, expandQuery, SHORT_TERMS } from "../gate/core/router-core.mjs"

/**
 * The tokenizer dropped every token shorter than 3 characters. That filter exists to kill
 * noise ("de", "el", "a"), and it also killed the strongest domain signals we have: ui, ux,
 * db, qa, ci, js, ts, ai.
 *
 * The cost was concrete. For "necesito armar un componente de UI con buen pulido",
 * emil-design-eng — whose description literally reads "UI polish, component design" —
 * scored 2 against a SOFT_MIN of 3 and was dropped entirely. It lost by exactly the point
 * that "ui" would have contributed.
 *
 * Keep the length filter, but exempt a small allowlist of real technical terms.
 */

test("short technical terms survive tokenization", () => {
  expect(tokenize("necesito ui y ux")).toContain("ui")
  expect(tokenize("necesito ui y ux")).toContain("ux")
  expect(tokenize("problema con la db")).toContain("db")
  expect(tokenize("configurar ci")).toContain("ci")
})

test("genuinely short noise is still dropped", () => {
  const out = tokenize("el de la un y a en")
  expect(out).not.toContain("de")
  expect(out).not.toContain("el")
  expect(out).not.toContain("a")
})

test("SHORT_TERMS holds only real technical terms, nothing longer than 2 chars", () => {
  for (const t of SHORT_TERMS) expect(t.length).toBeLessThanOrEqual(2)
})

// The regression this whole change exists for.
test("a UI-polish prompt reaches emil-design-eng, which describes exactly that", () => {
  const index = [
    {
      name: "emil-design-eng",
      desc: "philosophy on ui polish, component design, animation decisions, and the invisible details that make software feel great",
    },
    { name: "c4-component", desc: "c4 model component diagrams for architecture" },
  ]
  const scored = scoreRouter("necesito armar un componente de UI con buen pulido", index)
  const emil = scored.find((s: any) => s.name === "emil-design-eng")

  expect(emil).toBeDefined()
  // Must clear SOFT_MIN (3) so it is actually surfaced, not silently filtered out.
  expect(emil!.score).toBeGreaterThanOrEqual(3)
})

// --- Spanish-first vocabulary. Most users of this tool write Spanish. ---

test.each([
  ["desplegar", "deploy"],
  ["compilar", "build"],
  ["dependencias", "dependency"],
  ["credenciales", "credentials"],
  ["cifrado", "encryption"],
  ["contenedor", "container"],
  ["registro", "log"],
  ["monitoreo", "monitoring"],
  ["accesibilidad", "accessibility"],
  ["tipografia", "typography"],
  ["maquetado", "layout"],
  ["carrito", "cart"],
  ["factura", "invoice"],
  ["reunion", "meeting"],
  ["correo", "email"],
  ["informe", "report"],
  ["gráfico", "chart"],
  ["migración", "migration"],
])("%s expands to %s", (es, en) => {
  expect(expandQuery([es])).toContain(en)
})
