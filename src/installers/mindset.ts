import { existsSync, readFileSync } from "node:fs"
import { HOME, backup, writeText, type Action } from "../util.ts"
import { MINDSET_MD, MINDSET_START, MINDSET_END } from "../mindset-template.ts"
import { claudeGlobalMd, opencodeAgentsMd } from "../paths.ts"

/**
 * Signatures of a hand-rolled mindset section. When a user (or a previous manual setup)
 * already maintains their own protocol in the target file WITHOUT our markers, we must
 * not append a near-duplicate — their customized version wins.
 */
const CUSTOM_SIGNATURES = ["CÓMO PIENSA FABLE", "Engineering Mindset Protocol"]

export type UpsertResult =
  | { kind: "create"; next: string }
  | { kind: "append"; next: string }
  | { kind: "replace"; next: string }
  | { kind: "noop" }
  | { kind: "skip-custom" }

/**
 * Pure upsert of the managed mindset block into a rules file.
 *  - file absent            → create with the block
 *  - both markers present   → replace the block in place (upgrade path), noop if identical
 *  - custom section, no markers → skip (never duplicate a hand-rolled protocol)
 *  - otherwise              → append the block, preserving all existing content
 * Everything outside the markers is never touched.
 */
export function upsertMindset(existing: string | null): UpsertResult {
  const block = MINDSET_MD.trimEnd()

  if (existing === null) return { kind: "create", next: block + "\n" }

  const start = existing.indexOf(MINDSET_START)
  const end = existing.indexOf(MINDSET_END)

  if (start !== -1 && end !== -1 && end > start) {
    const current = existing.slice(start, end + MINDSET_END.length)
    if (current === block) return { kind: "noop" }
    const next = existing.slice(0, start) + block + existing.slice(end + MINDSET_END.length)
    return { kind: "replace", next }
  }

  // Markers absent (or corrupted to a single half — treat as absent and check custom).
  if (CUSTOM_SIGNATURES.some((sig) => existing.includes(sig))) return { kind: "skip-custom" }

  const sep = existing.endsWith("\n\n") ? "" : existing.endsWith("\n") ? "\n" : "\n\n"
  return { kind: "append", next: existing + sep + block + "\n" }
}

function applyTo(label: string, file: string, dryRun: boolean): Action {
  const existing = existsSync(file) ? readFileSync(file, "utf8") : null
  const res = upsertMindset(existing)

  switch (res.kind) {
    case "noop":
      return { label, done: true, detail: "up to date (skipped)" }
    case "skip-custom":
      return { label, done: true, detail: "custom mindset section detected — left untouched" }
    case "create":
    case "append":
    case "replace": {
      const verb = res.kind === "create" ? "create" : res.kind === "append" ? "append block to" : "upgrade block in"
      if (dryRun) return { label, done: false, detail: `would ${verb} ${file}` }
      const bak = existing !== null ? backup(file) : null
      writeText(file, res.next)
      return { label, done: true, detail: bak ? `${res.kind} (backup: ${bak})` : `${res.kind}: ${file}` }
    }
  }
}

/**
 * Install the FABLE engineering-mindset protocol globally:
 *  - Claude Code → ~/.claude/CLAUDE.md      (loaded in every session, any cwd)
 *  - opencode    → ~/.config/opencode/AGENTS.md (global rules, every session)
 * Managed marker block → re-runs upgrade in place; user content around it survives.
 */
export function installMindset(dryRun: boolean, targets: { claude: boolean; opencode: boolean }): Action[] {
  const actions: Action[] = []
  if (targets.claude) actions.push(applyTo("CLAUDE.md (global)", claudeGlobalMd(HOME), dryRun))
  if (targets.opencode) actions.push(applyTo("AGENTS.md (global)", opencodeAgentsMd(HOME), dryRun))
  return actions
}
