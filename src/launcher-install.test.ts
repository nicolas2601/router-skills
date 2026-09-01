import { test, expect } from "bun:test"

// cmd.exe shim tests can only execute on a real Windows host
const windowsTest = test.skipIf(process.platform !== "win32")
import { existsSync, readFileSync } from "node:fs"
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { tmpdir } from "node:os"
import nodePath from "node:path"
import {
  appendPosixPathConfig,
  binDir,
  launcherContent,
  launcherPath,
  pathEntry,
  posixPathBlock,
  updatedSessionPath,
} from "./launcher-install.ts"

test("binDir: selects the native spelling for each platform", () => {
  expect(binDir("C:\\Users\\Ada Smith", "windows")).toBe("C:\\Users\\Ada Smith\\.local\\bin")
  expect(binDir("/home/ada smith", "posix")).toBe("/home/ada smith/.local/bin")
  expect(launcherPath("C:\\Users\\Ada Smith", "windows")).toBe("C:\\Users\\Ada Smith\\.local\\bin\\router-skills.cmd")
  expect(launcherPath("/home/ada smith", "posix")).toBe("/home/ada smith/.local/bin/router-skills")
})

test("pathEntry: preserves existing PATH and deduplicates platform spellings", () => {
  expect(pathEntry("C:\\Windows;C:\\Tools", "C:\\Users\\Ada\\.local\\bin", "windows")).toEqual({
    value: "C:\\Windows;C:\\Tools;C:\\Users\\Ada\\.local\\bin",
    added: true,
  })
  expect(pathEntry("/usr/bin:/home/ada/.local/bin", "/home/ada/.local/bin", "posix")).toEqual({
    value: "/usr/bin:/home/ada/.local/bin",
    added: false,
  })
})

test("pathEntry: Windows PATH ending in a delimiter does not duplicate it", () => {
  expect(pathEntry("C:\\Windows;", "C:\\Users\\Ada\\.local\\bin", "windows")).toEqual({
    value: "C:\\Windows;C:\\Users\\Ada\\.local\\bin",
    added: true,
  })
})

test("pathEntry: POSIX PATH ending in a delimiter does not duplicate it", () => {
  expect(pathEntry("/usr/bin:", "/home/ada/.local/bin", "posix")).toEqual({
    value: "/usr/bin:/home/ada/.local/bin",
    added: true,
  })
})

test("pathEntry: joining covers empty, normal, repeated delimiters, and duplicates on both platforms", () => {
  const cases = [
    ["windows", "", "C:\\Users\\Ada\\.local\\bin", "C:\\Users\\Ada\\.local\\bin", true],
    ["windows", "C:\\Windows;C:\\Tools", "C:\\Users\\Ada\\.local\\bin", "C:\\Windows;C:\\Tools;C:\\Users\\Ada\\.local\\bin", true],
    ["windows", "C:\\Windows;;;", "C:\\Users\\Ada\\.local\\bin", "C:\\Windows;C:\\Users\\Ada\\.local\\bin", true],
    ["windows", "C:\\Windows;C:\\Users\\Ada\\.local\\bin;;", "C:\\Users\\Ada\\.local\\bin", "C:\\Windows;C:\\Users\\Ada\\.local\\bin;;", false],
    ["posix", "", "/home/ada/.local/bin", "/home/ada/.local/bin", true],
    ["posix", "/usr/bin:/opt/bin", "/home/ada/.local/bin", "/usr/bin:/opt/bin:/home/ada/.local/bin", true],
    ["posix", "/usr/bin:::", "/home/ada/.local/bin", "/usr/bin:/home/ada/.local/bin", true],
    ["posix", "/usr/bin:/home/ada/.local/bin::", "/home/ada/.local/bin", "/usr/bin:/home/ada/.local/bin::", false],
  ] as const

  for (const [platform, existing, entry, value, added] of cases) {
    expect(pathEntry(existing, entry, platform)).toEqual({ value, added })
  }
})

test("launcherContent: quotes spaces and is independent of cwd on both platforms", () => {
  const windows = launcherContent(
    "windows",
    "C:\\Users\\Ada Smith\\.router-skills",
    "C:\\Users\\Ada Smith\\.bun\\bin\\bun.exe",
  )
  expect(windows).toContain('"%ROUTER_SKILLS_BUN%" run "%ROUTER_SKILLS_ROOT%\\src\\index.ts" %*')

  const posix = launcherContent("posix", "/home/ada smith/.router-skills", "/opt/bun path/bin/bun")
  expect(posix).toContain("#!/usr/bin/env sh")
  expect(posix).toContain('exec "$ROUTER_SKILLS_BUN" run "$ROUTER_SKILLS_ROOT/src/index.ts" "$@"')
  expect(posix).not.toContain("cd ")
})

test("appendPosixPathConfig: keeps unrelated config and is idempotent", () => {
  const block = posixPathBlock("/home/ada smith/.local/bin")
  const first = appendPosixPathConfig("export PATH=\"$HOME/bin:$PATH\"\n", block)
  const second = appendPosixPathConfig(first, block)

  expect(first).toContain('export PATH="$HOME/bin:$PATH"')
  expect(first).toContain("router-skills: PATH")
  expect(second).toBe(first)
  expect(second.match(/router-skills: PATH begin/g)).toHaveLength(1)
})

test("pathEntry: POSIX paths use the host delimiter and do not overwrite entries", () => {
  const result = pathEntry("/existing:/another", "/home/ada smith/.local/bin", "posix")
  expect(result.value.split(":")).toEqual(["/existing", "/another", "/home/ada smith/.local/bin"])
})

test("updatedSessionPath: preserves entries and is idempotent on both platforms", () => {
  expect(updatedSessionPath("C:\\Windows;C:\\Users\\Ada\\.local\\bin", "c:/users/ada/.local/bin", "windows")).toBe(
    "C:\\Windows;C:\\Users\\Ada\\.local\\bin",
  )
  expect(updatedSessionPath("/usr/bin", "/home/ada/.local/bin", "posix")).toBe("/usr/bin:/home/ada/.local/bin")
})

test("bootstrap scripts delegate launcher policy to the shared TypeScript source", () => {
  const powershell = readFileSync(new URL("../install.ps1", import.meta.url), "utf8")
  const posix = readFileSync(new URL("../install.sh", import.meta.url), "utf8")
  for (const script of [powershell, posix]) {
    expect(script).toContain("src/launcher-install.ts")
    expect(script).toContain("--repo-path")
    expect(script).toContain("--session-path")
    expect(script).toContain("--bin-dir")
  }
  expect(powershell).toContain("--platform windows")
  expect(posix).toContain("--platform posix")
  expect(powershell).not.toContain("function Add-UserPathEntry")
  expect(powershell).not.toContain("function Install-Launcher")
})

windowsTest("generated Windows shim executes a runtime and preserves arguments from any cwd", () => {
  const sandbox = mkdtempSync(nodePath.join(tmpdir(), "router-skills-shim-"))
  try {
    const root = nodePath.join(sandbox, "repo with spaces")
    const runtime = nodePath.join(sandbox, "bun fake.cmd")
    const log = nodePath.join(sandbox, "args.log")
    const launcher = nodePath.join(sandbox, "router-skills.cmd")
    writeFileSync(runtime, `@echo off\r\necho %* > "${log}"\r\n`, "utf8")
    writeFileSync(launcher, launcherContent("windows", root, runtime), "utf8")

    execFileSync("cmd.exe", ["/d", "/c", launcher, "--dry-run", "value with spaces"], {
      cwd: nodePath.join(process.env.SystemRoot ?? "C:\\Windows", "Temp"),
      encoding: "utf8",
    })

    expect(readFileSync(log, "utf8").trim()).toBe(`run "${root}\\src\\index.ts" --dry-run "value with spaces"`)
  } finally {
    rmSync(sandbox, { recursive: true, force: true })
  }
})

windowsTest("generated Windows shim ignores a missing persisted runtime and falls back to PATH", () => {
  const sandbox = mkdtempSync(nodePath.join(tmpdir(), "router-skills-shim-fallback-"))
  try {
    const root = nodePath.join(sandbox, "repo")
    const runtime = nodePath.join(sandbox, "bun.cmd")
    const missingRuntime = nodePath.join(sandbox, "old", "bun.exe")
    const log = nodePath.join(sandbox, "args.log")
    const launcher = nodePath.join(sandbox, "router-skills.cmd")
    writeFileSync(runtime, `@echo off\r\necho %* > "${log}"\r\n`, "utf8")
    writeFileSync(launcher, launcherContent("windows", root, missingRuntime), "utf8")

    let failure: unknown
    try {
      execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/c", launcher, "--dry-run"], {
        cwd: nodePath.join(process.env.SystemRoot ?? "C:\\Windows", "Temp"),
        encoding: "utf8",
        env: {
          ...process.env,
          Path: `${sandbox};${nodePath.join(process.env.SystemRoot ?? "C:\\Windows", "System32")}`,
        },
      })
    } catch (error) {
      failure = error
    }

    expect(failure).toBeUndefined()
    expect(readFileSync(log, "utf8").trim()).toBe(`run "${root}\\src\\index.ts" --dry-run`)
  } finally {
    rmSync(sandbox, { recursive: true, force: true })
  }
})

windowsTest("generated Windows shim ignores a persisted runtime directory and falls back to PATH", () => {
  const sandbox = mkdtempSync(nodePath.join(tmpdir(), "router-skills-shim-directory-fallback-"))
  try {
    const root = nodePath.join(sandbox, "repo")
    const runtime = nodePath.join(sandbox, "bun.cmd")
    const persistedRuntimeDirectory = nodePath.join(sandbox, "old", "bun.exe")
    const log = nodePath.join(sandbox, "args.log")
    const launcher = nodePath.join(sandbox, "router-skills.cmd")
    mkdirSync(persistedRuntimeDirectory, { recursive: true })
    writeFileSync(runtime, `@echo off\r\necho %* > "${log}"\r\n`, "utf8")
    writeFileSync(launcher, launcherContent("windows", root, persistedRuntimeDirectory), "utf8")

    execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/c", launcher, "--dry-run"], {
      cwd: nodePath.join(process.env.SystemRoot ?? "C:\\Windows", "Temp"),
      encoding: "utf8",
      env: {
        ...process.env,
        Path: `${sandbox};${nodePath.join(process.env.SystemRoot ?? "C:\\Windows", "System32")}`,
      },
    })

    expect(readFileSync(log, "utf8").trim()).toBe(`run "${root}\\src\\index.ts" --dry-run`)
  } finally {
    rmSync(sandbox, { recursive: true, force: true })
  }
})

windowsTest("generated Windows shim ignores a persisted non-executable file and falls back to PATH", () => {
  const sandbox = mkdtempSync(nodePath.join(tmpdir(), "router-skills-shim-file-fallback-"))
  try {
    const root = nodePath.join(sandbox, "repo")
    const runtime = nodePath.join(sandbox, "bun.cmd")
    const persistedRuntimeFile = nodePath.join(sandbox, "old", "bun.txt")
    const log = nodePath.join(sandbox, "args.log")
    const launcher = nodePath.join(sandbox, "router-skills.cmd")
    mkdirSync(nodePath.dirname(persistedRuntimeFile), { recursive: true })
    writeFileSync(persistedRuntimeFile, "not a runtime", "utf8")
    writeFileSync(runtime, `@echo off\r\necho %* > "${log}"\r\n`, "utf8")
    writeFileSync(launcher, launcherContent("windows", root, persistedRuntimeFile), "utf8")

    execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/c", launcher, "--dry-run"], {
      cwd: nodePath.join(process.env.SystemRoot ?? "C:\\Windows", "Temp"),
      encoding: "utf8",
      env: {
        ...process.env,
        Path: `${sandbox};${nodePath.join(process.env.SystemRoot ?? "C:\\Windows", "System32")}`,
      },
    })

    expect(readFileSync(log, "utf8").trim()).toBe(`run "${root}\\src\\index.ts" --dry-run`)
  } finally {
    rmSync(sandbox, { recursive: true, force: true })
  }
})

windowsTest("generated Windows shim executes a Bun path containing literal percent signs", () => {
  const sandbox = mkdtempSync(nodePath.join(tmpdir(), "router-skills-shim-percent-"))
  try {
    const root = nodePath.join(sandbox, "repo")
    const runtime = nodePath.join(sandbox, "bun%PATH%.cmd")
    const log = nodePath.join(sandbox, "args.log")
    const launcher = nodePath.join(sandbox, "router-skills.cmd")
    writeFileSync(runtime, `@echo off\r\necho %* > "${log}"\r\n`, "utf8")
    writeFileSync(launcher, launcherContent("windows", root, runtime), "utf8")

    execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/c", launcher, "--dry-run"], {
      cwd: nodePath.join(process.env.SystemRoot ?? "C:\\Windows", "Temp"),
      encoding: "utf8",
      env: {
        ...process.env,
        Path: nodePath.join(process.env.SystemRoot ?? "C:\\Windows", "System32"),
      },
    })

    expect(readFileSync(log, "utf8").trim()).toBe(`run "${root}\\src\\index.ts" --dry-run`)
  } finally {
    rmSync(sandbox, { recursive: true, force: true })
  }
})

windowsTest("generated Windows shim preserves cmd metacharacters in quoted paths", () => {
  const sandbox = mkdtempSync(nodePath.join(tmpdir(), "router-skills-shim-metachar-"))
  try {
    const root = nodePath.join(sandbox, "repo &(!)")
    const runtime = nodePath.join(sandbox, "bun &(!).cmd")
    const log = nodePath.join(sandbox, "args.log")
    const launcher = nodePath.join(sandbox, "router-skills.cmd")
    writeFileSync(runtime, `@echo off\r\necho %* > "${log}"\r\n`, "utf8")
    writeFileSync(launcher, launcherContent("windows", root, runtime), "utf8")

    execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/c", launcher, "--dry-run"], {
      cwd: nodePath.join(process.env.SystemRoot ?? "C:\\Windows", "Temp"),
      encoding: "utf8",
      env: {
        ...process.env,
        Path: nodePath.join(process.env.SystemRoot ?? "C:\\Windows", "System32"),
      },
    })

    expect(readFileSync(log, "utf8").trim()).toBe(`run "${root}\\src\\index.ts" --dry-run`)
  } finally {
    rmSync(sandbox, { recursive: true, force: true })
  }
})

windowsTest("generated Windows shim preserves a caret in quoted paths", () => {
  const sandbox = mkdtempSync(nodePath.join(tmpdir(), "router-skills-shim-caret-"))
  try {
    const root = nodePath.join(sandbox, "repo ^")
    const runtime = nodePath.join(sandbox, "bun ^.cmd")
    const log = nodePath.join(sandbox, "args.log")
    const launcher = nodePath.join(sandbox, "router-skills.cmd")
    writeFileSync(runtime, `@echo off\r\necho %* > "${log}"\r\n`, "utf8")
    writeFileSync(launcher, launcherContent("windows", root, runtime), "utf8")

    execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/c", launcher, "--dry-run"], {
      cwd: nodePath.join(process.env.SystemRoot ?? "C:\\Windows", "Temp"),
      encoding: "utf8",
      env: {
        ...process.env,
        Path: nodePath.join(process.env.SystemRoot ?? "C:\\Windows", "System32"),
      },
    })

    expect(readFileSync(log, "utf8").trim()).toBe(`run "${root}\\src\\index.ts" --dry-run`)
  } finally {
    rmSync(sandbox, { recursive: true, force: true })
  }
})

windowsTest("generated Windows shim reports an actionable error when Bun is absent", () => {
  const sandbox = mkdtempSync(nodePath.join(tmpdir(), "router-skills-shim-no-bun-"))
  try {
    const launcher = nodePath.join(sandbox, "router-skills.cmd")
    writeFileSync(
      launcher,
      launcherContent("windows", nodePath.join(sandbox, "repo"), nodePath.join(sandbox, "missing", "bun.exe")),
      "utf8",
    )

    let failure: { status?: number; stdout?: string; stderr?: string } | undefined
    try {
      execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/c", launcher], {
        cwd: nodePath.join(process.env.SystemRoot ?? "C:\\Windows", "Temp"),
        encoding: "utf8",
        env: {
          ...process.env,
          Path: nodePath.join(process.env.SystemRoot ?? "C:\\Windows", "System32"),
        },
      })
    } catch (error) {
      failure = error as { status?: number; stdout?: string; stderr?: string }
    }

    expect(failure?.status).toBe(1)
    const output = `${failure?.stdout ?? ""}${failure?.stderr ?? ""}`
    expect(output).toContain("Bun was not found")
    expect(output).toContain("https://bun.sh")
  } finally {
    rmSync(sandbox, { recursive: true, force: true })
  }
})

test("generated POSIX launcher executes under Git Bash with spaces and an isolated PATH", () => {
  const gitBash = "C:\\Program Files\\Git\\bin\\bash.exe"
  if (!existsSync(gitBash)) return
  const toBashPath = (value: string) => `/${value[0].toLowerCase()}${value.slice(2).replaceAll("\\", "/")}`
  const sandbox = mkdtempSync(nodePath.join(tmpdir(), "router-skills-posix-"))
  try {
    const root = nodePath.join(sandbox, "repo with spaces")
    const runtime = nodePath.join(sandbox, "bun fake")
    const log = nodePath.join(sandbox, "args.log")
    const launcher = nodePath.join(sandbox, "router-skills")
    writeFileSync(runtime, `#!/usr/bin/env sh\nprintf '%s\\n' "$*" > '${toBashPath(log)}'\n`, "utf8")
    chmodSync(runtime, 0o755)
    writeFileSync(launcher, launcherContent("posix", `${toBashPath(root)}`, toBashPath(runtime)), "utf8")
    chmodSync(launcher, 0o755)

    execFileSync(gitBash, ["-lc", `"${toBashPath(launcher)}" --dry-run "value with spaces"`], {
      cwd: nodePath.join(process.env.SystemRoot ?? "C:\\Windows", "Temp"),
      encoding: "utf8",
      env: { PATH: "/usr/bin" },
    })

    expect(readFileSync(log, "utf8").trim()).toBe(`run ${toBashPath(root)}/src/index.ts --dry-run value with spaces`)

    const configuredBin = nodePath.join(sandbox, "bin with spaces")
    const pathScript = nodePath.join(sandbox, "path-test.sh")
    writeFileSync(pathScript, `#!/usr/bin/env sh\n${posixPathBlock(toBashPath(configuredBin))}printf '%s\\n' "$PATH"\n`, "utf8")
    chmodSync(pathScript, 0o755)
    const pathOutput = execFileSync(gitBash, ["-lc", `"${toBashPath(pathScript)}"`], {
      encoding: "utf8",
      env: { PATH: "/usr/bin" },
    }).trim()
    expect(pathOutput.split(":")[0]).toBe(toBashPath(configuredBin))
    expect(pathOutput.split(":").filter((entry) => entry === toBashPath(configuredBin))).toHaveLength(1)
  } finally {
    rmSync(sandbox, { recursive: true, force: true })
  }
})

test("generated POSIX launcher validates persisted Bun as a regular executable file", () => {
  const posix = launcherContent("posix", "/tmp/router-skills", "/opt/bun/bin/bun")

  expect(posix).toContain('[ ! -f "$ROUTER_SKILLS_BUN" ]')
  expect(posix).toContain('[ ! -x "$ROUTER_SKILLS_BUN" ]')
})

test("generated POSIX launcher falls back from missing, directory, and non-executable runtimes", () => {
  const gitBash = "C:\\Program Files\\Git\\bin\\bash.exe"
  if (!existsSync(gitBash)) return
  const toBashPath = (value: string) => `/${value[0].toLowerCase()}${value.slice(2).replaceAll("\\", "/")}`
  const sandbox = mkdtempSync(nodePath.join(tmpdir(), "router-skills-posix-fallback-"))
  try {
    const root = nodePath.join(sandbox, "repo")
    const fallback = nodePath.join(sandbox, "bin with spaces", "bun")
    const log = nodePath.join(sandbox, "args.log")
    const directory = nodePath.join(sandbox, "old", "bun")
    const nonExecutable = nodePath.join(sandbox, "old", "bun.txt")
    mkdirSync(directory, { recursive: true })
    mkdirSync(nodePath.dirname(nonExecutable), { recursive: true })
    writeFileSync(nonExecutable, "not a runtime", "utf8")
    mkdirSync(nodePath.dirname(fallback), { recursive: true })
    writeFileSync(fallback, `#!/usr/bin/env sh\nprintf '%s\\n' "$*" > '${toBashPath(log)}'\n`, "utf8")
    chmodSync(fallback, 0o755)

    for (const persisted of [nodePath.join(sandbox, "missing", "bun"), directory, nonExecutable]) {
      rmSync(log, { force: true })
      const launcher = nodePath.join(sandbox, "router-skills")
      writeFileSync(launcher, launcherContent("posix", toBashPath(root), toBashPath(persisted)), "utf8")
      chmodSync(launcher, 0o755)

      execFileSync(gitBash, ["-lc", `"${toBashPath(launcher)}" --dry-run`], {
        cwd: nodePath.join(process.env.SystemRoot ?? "C:\\Windows", "Temp"),
        encoding: "utf8",
        env: { PATH: `${toBashPath(nodePath.dirname(fallback))}:/usr/bin` },
      })

      expect(readFileSync(log, "utf8").trim()).toBe(`run ${toBashPath(root)}/src/index.ts --dry-run`)
    }
  } finally {
    rmSync(sandbox, { recursive: true, force: true })
  }
})
