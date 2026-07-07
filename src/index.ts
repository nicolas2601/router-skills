#!/usr/bin/env bun
import { intro, outro, multiselect, confirm, isCancel, cancel, note, log, spinner } from "@clack/prompts"
import pc from "picocolors"
import { detectTargets, detectReportOnly } from "./detect.ts"
import { installClaude } from "./installers/claude.ts"
import { installOpencode } from "./installers/opencode.ts"
import { installSkills } from "./installers/skills.ts"
import { installAgents } from "./installers/agents.ts"
import { verify } from "./verify.ts"
import type { Action } from "./util.ts"

const argv = new Set(process.argv.slice(2))
const YES = argv.has("--yes") || argv.has("-y")
const DRY = argv.has("--dry-run") || argv.has("-n")
const HELP = argv.has("--help") || argv.has("-h")
const VERIFY = argv.has("--verify") || argv.has("-v")

if (HELP) {
  console.log(`
${pc.bold("router-skills")} — force Claude Code & opencode to use skills, everywhere.

Usage:
  router-skills            interactive TUI
  router-skills --yes      configure every detected CLI + link skills, no prompts
  router-skills --dry-run  show what would change, touch nothing
  router-skills --verify   audit what's installed (read-only), then exit
  router-skills --help     this

What it does:
  • Claude Code  → installs the skill-gate (eval + track + Stop-block hooks) + wires settings.json
  • opencode     → installs skill-enforcer plugin (gate on first work tool) + rule + permission.skill allow
  • skills       → symlinks the bundled pack into ~/.claude/skills (both harnesses read it)
  • agents       → links the bundled agent pack into ~/.claude/agents (+ opencode agents when chosen)
`)
  process.exit(0)
}

function printActions(title: string, actions: Action[]) {
  const lines = actions.map((a) => {
    const mark = a.done ? pc.green("✓") : pc.yellow("•")
    return `${mark} ${a.label}${a.detail ? pc.dim(" — " + a.detail) : ""}`
  })
  note(lines.join("\n"), title)
}

function runVerify() {
  intro(pc.bgMagenta(pc.black(" router-skills ")) + pc.cyan(" [verify]"))
  const checks = verify()
  const lines = checks.map((c) => {
    const mark = c.ok === null ? pc.dim("–") : c.ok ? pc.green("✓") : pc.red("✗")
    return `${mark} ${c.name} ${pc.dim("— " + c.detail)}`
  })
  note(lines.join("\n"), "Install health")
  const failed = checks.filter((c) => c.ok === false).length
  outro(failed === 0 ? pc.green("All checks passed.") : pc.red(`${failed} check(s) failed — re-run router-skills to fix.`))
  process.exit(failed === 0 ? 0 : 1)
}

async function main() {
  if (VERIFY) return runVerify()

  intro(pc.bgMagenta(pc.black(" router-skills ")) + (DRY ? pc.yellow(" [dry-run]") : ""))

  const targets = detectTargets()
  const reportOnly = detectReportOnly()

  // detection summary
  const detLines = targets.map((t) =>
    t.present ? `${pc.green("✓")} ${t.name} ${pc.dim("(" + t.via + ")")}` : `${pc.dim("✗ " + t.name + " (not found)")}`,
  )
  note(detLines.join("\n"), "Detected CLIs")

  if (reportOnly.length > 0) {
    note(
      reportOnly.map((r) => `${pc.cyan("•")} ${r.name} ${pc.dim("— " + r.note + ", skipped")}`).join("\n"),
      "Found but not configurable",
    )
  }

  const present = targets.filter((t) => t.present)
  if (present.length === 0) {
    cancel("No supported CLI found (need Claude Code or opencode). Nothing to do.")
    process.exit(1)
  }

  // pick targets + skills
  let chosen: string[]
  let doSkills: boolean
  let doAgents: boolean

  if (YES) {
    chosen = present.map((t) => t.id)
    doSkills = true
    doAgents = true
  } else {
    const sel = await multiselect({
      message: "Configure skill enforcement for:",
      options: present.map((t) => ({ value: t.id, label: t.name, hint: t.via })),
      initialValues: present.map((t) => t.id),
      required: true,
    })
    if (isCancel(sel)) return cancel("Cancelled.")
    chosen = sel as string[]

    const sk = await confirm({ message: "Also link the bundled skill pack into ~/.claude/skills?", initialValue: true })
    if (isCancel(sk)) return cancel("Cancelled.")
    doSkills = sk as boolean

    const ag = await confirm({ message: "Also link the bundled agent pack into ~/.claude/agents (+ opencode)?", initialValue: true })
    if (isCancel(ag)) return cancel("Cancelled.")
    doAgents = ag as boolean
  }

  // run
  const s = spinner()
  s.start(DRY ? "Computing changes…" : "Applying changes…")

  if (chosen.includes("claude")) {
    s.message("Claude Code…")
    printActions("Claude Code", installClaude(DRY))
  }
  if (chosen.includes("opencode")) {
    s.message("opencode…")
    printActions("opencode", installOpencode(DRY))
  }
  if (doSkills) {
    s.message("Linking skills…")
    printActions("Skills", installSkills(DRY).actions)
  }
  if (doAgents) {
    s.message("Linking agents…")
    printActions("Agents", installAgents(DRY, chosen.includes("opencode")).actions)
  }

  s.stop(DRY ? "Dry-run complete — nothing written." : "Done.")

  if (!DRY) {
    log.warn(pc.yellow("Restart Claude Code and opencode sessions for hooks/plugin to load."))
  }
  outro(DRY ? "Re-run without --dry-run to apply." : "router-skills: both harnesses will now evaluate skills every turn.")
}

main().catch((e) => {
  cancel("skillforge failed: " + (e?.message ?? String(e)))
  process.exit(1)
})
