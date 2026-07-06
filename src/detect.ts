import { join } from "node:path"
import { HOME, exists, onPath } from "./util.ts"

export type Target = {
  id: "claude" | "opencode"
  name: string
  present: boolean
  /** how it was detected, for display */
  via: string
  /** true = skillforge can install enforcement for it */
  supported: true
}

export type ReportOnly = {
  id: string
  name: string
  present: boolean
  note: string
}

/** First-class targets skillforge can configure. */
export function detectTargets(): Target[] {
  const claudeDir = join(HOME, ".claude")
  const claudePresent = exists(claudeDir) || onPath("claude")

  const ocDir = join(HOME, ".config", "opencode")
  const ocPresent = exists(ocDir) || onPath("opencode")

  return [
    {
      id: "claude",
      name: "Claude Code",
      present: claudePresent,
      via: exists(claudeDir) ? "~/.claude" : onPath("claude") ? "claude on PATH" : "not found",
      supported: true,
    },
    {
      id: "opencode",
      name: "opencode",
      present: ocPresent,
      via: exists(ocDir) ? "~/.config/opencode" : onPath("opencode") ? "opencode on PATH" : "not found",
      supported: true,
    },
  ]
}

/** Other agentic CLIs we detect but do NOT configure (no SKILL.md enforcement model). */
export function detectReportOnly(): ReportOnly[] {
  const checks: { id: string; name: string; paths: string[]; bins: string[]; note: string }[] = [
    { id: "cursor", name: "Cursor", paths: [".cursor"], bins: ["cursor"], note: "uses rules, not SKILL.md" },
    { id: "gemini", name: "Gemini CLI", paths: [".gemini"], bins: ["gemini"], note: "no global SKILL.md discovery" },
    { id: "windsurf", name: "Windsurf", paths: [".codeium", ".windsurf"], bins: ["windsurf"], note: "uses rules" },
    { id: "aider", name: "aider", paths: [".aider"], bins: ["aider"], note: "no skills model" },
  ]
  return checks
    .map((c): ReportOnly | null => {
      const present = c.paths.some((p) => exists(join(HOME, p))) || c.bins.some((b) => onPath(b))
      return present ? { id: c.id, name: c.name, present, note: c.note } : null
    })
    .filter((x): x is ReportOnly => x !== null)
}
