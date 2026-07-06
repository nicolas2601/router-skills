import { readdirSync, existsSync, symlinkSync, lstatSync, readFileSync, writeFileSync, rmSync, realpathSync } from "node:fs"
import { join, basename, sep } from "node:path"
import { HOME, AGENTS, ensureDir, type Action } from "../util.ts"
import { claudeAgentsDir, opencodeAgentsDir } from "../paths.ts"

/**
 * Link/convert the bundled agent pack into the harnesses' global agent dirs.
 *
 *   Claude Code → ~/.claude/agents        — raw link (Claude reads categorised subdirs
 *                                            recursively; native format, no conversion).
 *   opencode    → ~/.config/opencode/agents — CONVERTED. opencode's agent schema differs
 *                                            (no `name`, `tools` is an object not a comma
 *                                            string, `mode` is required). Linking Claude
 *                                            agents raw makes opencode error on nearly all
 *                                            of them, so each is rewritten to a minimal,
 *                                            schema-valid opencode agent instead.
 *
 * Cross-platform, no admin: Claude dir entries use "dir" symlinks / Windows "junctions";
 * converted opencode agents are plain files (written, not linked).
 */
export function installAgents(dryRun: boolean, opencodePresent: boolean): { actions: Action[] } {
  const actions: Action[] = []

  if (!existsSync(AGENTS)) {
    actions.push({ label: "bundled agents", done: false, detail: `no agent pack at ${AGENTS}` })
    return { actions }
  }

  actions.push(linkClaudeAgents(dryRun))
  if (opencodePresent) actions.push(convertOpencodeAgents(dryRun))

  return { actions }
}

/** Claude Code: link top-level pack entries (category dirs + loose .md) into ~/.claude/agents. */
function linkClaudeAgents(dryRun: boolean): Action {
  const target = claudeAgentsDir(HOME)
  const linkType = process.platform === "win32" ? "junction" : "dir"
  const entries = readdirSync(AGENTS, { withFileTypes: true })
  if (!dryRun) ensureDir(target)

  let linked = 0
  let skipped = 0
  for (const e of entries) {
    const src = join(AGENTS, e.name)
    const dest = join(target, e.name)
    if (existsSync(dest) || isLink(dest)) {
      skipped++
      continue
    }
    if (!dryRun) {
      try {
        if (e.isDirectory()) symlinkSync(src, dest, linkType)
        else if (e.isFile() && e.name.endsWith(".md")) writeFileSync(dest, readFileSync(src))
        else continue
      } catch {
        continue
      }
    }
    linked++
  }

  return {
    label: "agents → ~/.claude/agents",
    done: !dryRun,
    detail: `${dryRun ? "would link" : "linked"} ${linked} new, ${skipped} present`,
  }
}

/** opencode: convert every pack agent to a schema-valid opencode agent, written flat. */
function convertOpencodeAgents(dryRun: boolean): Action {
  const target = opencodeAgentsDir(HOME)
  if (!dryRun) ensureDir(target)

  // Clean up stale links from earlier raw-link installs: opencode agents must be flat
  // files, so remove any symlink/junction in this dir that points back into our pack
  // (these are the category dirs a previous version wrongly linked, which opencode errors on).
  const pruned = dryRun ? countStaleLinks(target) : pruneStaleLinks(target)

  const files = collectMarkdown(AGENTS)
  const used = new Set<string>()
  let written = 0
  let skipped = 0
  let failed = 0

  for (const file of files) {
    let slug = slugify(basename(file, ".md"))
    if (!slug) {
      failed++
      continue
    }
    // de-collide flattened names (categories are flattened into one dir)
    let unique = slug
    let n = 2
    while (used.has(unique)) unique = `${slug}-${n++}`
    used.add(unique)

    const dest = join(target, `${unique}.md`)
    if (existsSync(dest) && isValidOpencodeAgent(dest)) {
      // respect a file that's already a valid opencode agent (ours or the user's)
      skipped++
      continue
    }
    const converted = toOpencodeAgent(readFileSafe(file), unique)
    if (!converted) {
      failed++
      continue
    }
    if (!dryRun) writeFileSync(dest, converted) // overwrites a raw/broken agent from an old install
    written++
  }

  const parts = [
    `${dryRun ? "would write" : "wrote"} ${written}`,
    `${skipped} present`,
    pruned > 0 ? `${pruned} stale link${pruned === 1 ? "" : "s"} removed` : null,
    failed > 0 ? `${failed} skipped (unparseable)` : null,
  ].filter(Boolean)
  return {
    label: "agents → ~/.config/opencode/agents (converted)",
    done: !dryRun,
    detail: `${parts.join(", ")} (of ${files.length})`,
  }
}

/** True when a file already looks like a valid opencode agent (has a mode: in its frontmatter). */
function isValidOpencodeAgent(p: string): boolean {
  try {
    // scan the whole frontmatter block, not a fixed byte window — a long description
    // must not push `mode:` out of view and cause us to overwrite a real user agent
    const { fm } = parseFrontmatter(readFileSync(p, "utf8"))
    return /^(subagent|primary|all)$/.test((fm.mode ?? "").trim())
  } catch {
    return false
  }
}

/** Symlinks/junctions in `dir` that resolve back into our agent pack (stale from raw-link installs). */
function staleLinks(dir: string): string[] {
  const out: string[] = []
  let packRoot: string
  try {
    packRoot = realpathSync(AGENTS)
  } catch {
    return out
  }
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const name of entries) {
    const p = join(dir, name)
    if (!isLink(p)) continue
    try {
      // match a real path boundary — `.../agents` must not match a sibling `.../agents-backup`
      const rp = realpathSync(p)
      if (rp === packRoot || rp.startsWith(packRoot + sep)) out.push(p)
    } catch {
      // broken link that can't resolve — a raw-install leftover; prune it too
      out.push(p)
    }
  }
  return out
}

function countStaleLinks(dir: string): number {
  return staleLinks(dir).length
}

function pruneStaleLinks(dir: string): number {
  const links = staleLinks(dir)
  let removed = 0
  for (const p of links) {
    try {
      rmSync(p, { recursive: true, force: true })
      removed++
    } catch {
      /* leave it */
    }
  }
  return removed
}

/**
 * Rewrite a Claude/agency agent into a minimal opencode-valid agent.
 * Emits only fields opencode understands: `description` (required) + `mode: subagent`.
 * Drops `name`, `tools` (comma-string form opencode rejects) and other Claude-only keys.
 */
export function toOpencodeAgent(text: string, fallbackName: string): string | null {
  if (!text) return null
  const { fm, body } = parseFrontmatter(text)
  const description = flatten(fm.description || fm.name || fallbackName)
  if (!description) return null
  const meta: string[] = [`description: ${yamlDouble(description)}`, "mode: subagent"]
  // carry a temperature through only if it is a clean number
  if (fm.temperature && /^-?\d+(\.\d+)?$/.test(fm.temperature.trim())) meta.push(`temperature: ${fm.temperature.trim()}`)
  return `---\n${meta.join("\n")}\n---\n\n${body.trimStart()}`
}

/** Minimal frontmatter parser. Captures `key: value` and YAML block scalars (`|`, `>`). */
export function parseFrontmatter(text: string): { fm: Record<string, string>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text)
  if (!m) return { fm: {}, body: text }
  const fm: Record<string, string> = {}
  let key: string | null = null
  let buf: string[] = []
  const flush = () => {
    if (key) fm[key] = buf.join(" ").trim()
    key = null
    buf = []
  }
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s?(.*)$/.exec(line)
    if (kv && !/^\s/.test(line)) {
      flush()
      const [, k, v] = kv
      const t = v.trim()
      if (t === "" || t === "|" || t === ">" || t === "|-" || t === ">-") key = k
      else fm[k] = t
    } else if (key && /^\s+\S/.test(line)) {
      buf.push(line.trim())
    }
  }
  flush()
  return { fm, body: m[2] }
}

function collectMarkdown(root: string): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.isFile() && e.name.endsWith(".md")) out.push(p)
    }
  }
  try {
    walk(root)
  } catch {
    /* unreadable subtree — return what we have */
  }
  return out.sort()
}

function readFileSafe(p: string): string {
  try {
    return readFileSync(p, "utf8")
  } catch {
    return ""
  }
}

function flatten(s: string): string {
  let t = s.replace(/\s+/g, " ").trim()
  // drop a leftover block-scalar indicator, then one layer of matching surrounding quotes
  t = t.replace(/^[>|][-+]?\s*/, "")
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1)
  }
  return t.trim().slice(0, 500)
}

function yamlDouble(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function isLink(p: string): boolean {
  try {
    return lstatSync(p).isSymbolicLink()
  } catch {
    return false
  }
}
