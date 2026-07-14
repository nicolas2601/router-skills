import { test, expect } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { composePluginTs } from "../scripts/gen-templates.mjs"

/**
 * C1: THE ORIGINAL BUG, REINTRODUCED VERBATIM FOR OPENCODE.
 *
 * `getIndex()` in the opencode plugin shell never called `ensureIndex()` — the only call
 * sites for that function are Claude-only (`installClaude`, `skill-gate-eval.mjs`,
 * `skill-router.mjs`). An opencode-only user (no Claude Code installed at all) gets no
 * index built by anyone: `loadIndex` reads a file that was never written -> `[]` -> cached
 * (arrays are always truthy in JS, so `if (INDEX_CACHE) return INDEX_CACHE` cached it
 * forever after the first call) -> `scoreGate` always returns `[]` -> `required` is always
 * `[]` -> the tool gate NEVER fires, silently, for the entire life of the opencode process.
 * And there was no opencode equivalent of `[ROUTER WARNING]`/`[GATE WARNING]` anywhere in
 * that file — this is the exact bug this whole change exists to kill, left unfixed for the
 * one harness that has no Claude-side hook to self-heal it.
 *
 * This test runs the REAL composed PLUGIN_TS (transpiled, executed as a real ESM module in
 * a child process against a genuinely empty, fresh $HOME with no ~/.claude/skills at all)
 * and proves two things end-to-end:
 *   (a) the system-prompt block the plugin injects contains a LOUD warning when the index
 *       is empty (never silent again), and
 *   (b) that empty state is NOT cached permanently — once a real skill appears on disk
 *       (simulating a Claude Code hook building the index, or the user installing a skill
 *       mid-session), the VERY NEXT chat turn in the SAME process self-heals: the warning
 *       is gone and the skill index is genuinely populated.
 */
test("opencode plugin: getIndex() builds the index and warns loudly when empty, self-heals once populated (C1)", () => {
  const home = mkdtempSync(join(tmpdir(), "skillforge-opencode-plugin-"))
  const workDir = mkdtempSync(join(tmpdir(), "skillforge-opencode-plugin-work-"))
  try {
    const js = new Bun.Transpiler({ loader: "ts" }).transformSync(composePluginTs())
    const pluginPath = join(workDir, "plugin.mjs")
    writeFileSync(pluginPath, js)

    const harnessPath = join(workDir, "harness.mjs")
    writeFileSync(
      harnessPath,
      [
        `import { SkillEnforcer } from ${JSON.stringify(pluginPath)}`,
        `import { mkdirSync, writeFileSync } from "node:fs"`,
        `import { join } from "node:path"`,
        ``,
        `const plugin = await SkillEnforcer()`,
        ``,
        `async function turn(text) {`,
        `  const chatOutput = { parts: [{ type: "text", text }], message: { sessionID: "s1" } }`,
        `  await plugin["chat.message"]({}, chatOutput)`,
        `  const sysOutput = { system: [] }`,
        `  await plugin["experimental.chat.system.transform"]({}, sysOutput)`,
        `  return sysOutput.system.join("\\n---\\n")`,
        `}`,
        ``,
        `const block1 = await turn("please review my react component for accessibility issues")`,
        ``,
        `// Simulate a skill appearing on disk mid-process (e.g. a Claude Code hook builds`,
        `// the index, or the user runs router-skills / installs a skill).`,
        `const skillDir = join(process.env.HOME, ".claude", "skills", "turbo-cache")`,
        `mkdirSync(skillDir, { recursive: true })`,
        `writeFileSync(join(skillDir, "SKILL.md"), ["---", 'description: "cache cache cache invalidation layer"', "---", ""].join("\\n"))`,
        ``,
        `const block2 = await turn("please cache it correctly today")`,
        ``,
        `process.stdout.write(JSON.stringify({ block1, block2 }))`,
      ].join("\n"),
    )

    const result = spawnSync(process.execPath, [harnessPath], {
      env: { HOME: home, PATH: process.env.PATH },
      encoding: "utf8",
      timeout: 20_000,
    })

    expect(result.status).toBe(0)
    expect(result.stderr || "").toBe("")

    const { block1, block2 } = JSON.parse(result.stdout || "{}") as { block1: string; block2: string }

    // (a) empty index -> LOUD warning, never silent.
    expect(block1).toContain("[SKILL GATE WARNING]")
    expect(block1).toContain("enforcement INACTIVE")

    // (b) self-heals within the SAME process once the index becomes genuinely non-empty —
    // the empty state must NOT have been cached permanently.
    expect(block2).not.toContain("[SKILL GATE WARNING]")
  } finally {
    rmSync(home, { recursive: true, force: true })
    rmSync(workDir, { recursive: true, force: true })
  }
})
