/**
 * Spanish -> English term lexicon for the router.
 *
 * The router scores the user's prompt against skill descriptions, and those descriptions
 * are written in English. A Spanish prompt therefore shares almost no tokens with them,
 * so noise outranks the right answer. Measured against the real 1307-skill index, five
 * out of five Spanish prompts routed to something unrelated ("revisar la seguridad de
 * este endpoint" -> graphql; "escribir la documentacion" -> react-email).
 *
 * This is a LANGUAGE gap, not a semantics gap, so it is fixed with a lexicon rather than
 * embeddings. Embeddings would put a hard Ollama dependency plus 50-200ms on the critical
 * path of a hook that runs on every single prompt — a worse failure mode than the one it
 * would fix, and no better at the mismatch that actually causes the misses.
 *
 * Honest about the limits: this buys bilingual LEXICAL matching. It does not buy semantic
 * understanding. A prompt whose words never appear in any description still misses.
 *
 * Keys are accent-stripped and lowercase; `expandQuery` normalizes before lookup, and also
 * retries a naive singular form, so "animaciones" and "animación" both reach "animation".
 */
export const ES_EN = {
  // UI / frontend
  animacion: ["animation", "motion"],
  animar: ["animate", "animation"],
  transicion: ["transition"],
  desplazamiento: ["scroll"],
  boton: ["button"],
  pantalla: ["screen"],
  ventana: ["modal", "dialog"],
  cajon: ["drawer"],
  formulario: ["form"],
  componente: ["component"],
  diseno: ["design", "ui"],
  maquetado: ["layout"],
  estilo: ["style", "css"],
  tipografia: ["typography", "font"],
  pulido: ["polish", "craft"],
  acabado: ["polish"],
  interfaz: ["interface", "ui"],
  usabilidad: ["usability", "ux"],
  accesibilidad: ["accessibility", "a11y"],
  oscuro: ["dark"],
  tema: ["theme"],
  movil: ["mobile"],
  escritorio: ["desktop"],
  navegador: ["browser"],

  // Backend / data
  servidor: ["server", "backend"],
  consulta: ["query"],
  base: ["database"],
  datos: ["data", "database"],
  tabla: ["table"],
  esquema: ["schema"],
  migracion: ["migration"],
  indice: ["index"],
  cache: ["cache", "caching"],
  cola: ["queue"],
  autenticacion: ["authentication", "auth"],
  autorizacion: ["authorization", "auth"],
  sesion: ["session"],
  contrasena: ["password"],
  usuario: ["user"],
  archivo: ["file"],
  carpeta: ["directory", "folder"],
  ruta: ["route", "path"],
  peticion: ["request"],
  respuesta: ["response"],
  puerto: ["port"],
  despliegue: ["deploy", "deployment"],
  contenedor: ["container", "docker"],
  entorno: ["environment"],
  variable: ["variable", "env"],

  // Quality / process
  prueba: ["test", "testing"],
  probar: ["test"],
  cobertura: ["coverage"],
  revisar: ["review"],
  revision: ["review"],
  auditar: ["audit"],
  auditoria: ["audit"],
  seguridad: ["security"],
  vulnerabilidad: ["vulnerability"],
  fuga: ["leak"],
  rendimiento: ["performance"],
  optimizar: ["optimize", "optimization"],
  optimizacion: ["optimization", "performance"],
  lento: ["slow", "performance"],
  rapido: ["fast", "performance"],
  memoria: ["memory"],
  error: ["error", "bug"],
  fallo: ["failure", "bug"],
  arreglar: ["fix"],
  depurar: ["debug"],
  refactorizar: ["refactor"],
  refactorizacion: ["refactor", "refactoring"],
  documentacion: ["documentation", "docs"],
  documentar: ["document", "documentation"],
  guia: ["guide"],
  registro: ["log", "logging"],
  monitoreo: ["monitoring", "observability"],
  despliegar: ["deploy"],

  // Architecture / meta
  arquitectura: ["architecture"],
  patron: ["pattern"],
  dependencia: ["dependency"],
  biblioteca: ["library"],
  libreria: ["library"],
  paquete: ["package"],
  version: ["version", "versioning"],
  publicar: ["release", "publish"],
  lanzamiento: ["release"],
  rama: ["branch"],
  fusionar: ["merge"],
  confirmacion: ["commit"],
  flujo: ["workflow", "flow"],
  tarea: ["task"],
  agente: ["agent"],
  herramienta: ["tool"],
  correo: ["email"],
  pago: ["payment"],
  tienda: ["store", "ecommerce"],
  busqueda: ["search"],
  buscar: ["search"],
  imagen: ["image"],
  video: ["video"],
  juego: ["game"],
}

/** Strip accents and lowercase, so "animación" and "animacion" hit the same key. */
export function normalizeEs(word) {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

/**
 * A naive Spanish singularizer. Only used as a LOOKUP fallback — it never rewrites the
 * user's token, so a wrong guess costs nothing but a missed lookup.
 */
export function singularizeEs(word) {
  if (word.length <= 3) return word
  if (word.endsWith("ces")) return word.slice(0, -3) + "z" // luces -> luz
  if (word.endsWith("es")) return word.slice(0, -2) // errores -> error
  if (word.endsWith("s")) return word.slice(0, -1) // pruebas -> prueba
  return word
}
