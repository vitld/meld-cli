import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { GitignoreGenerator } from "../gitignore.js";
import type { MeldConfig } from "../../config/types.js";
import type { ComposedContext } from "../../context/types.js";

function makeConfig(): MeldConfig {
  return {
    projects: {},
    agents: { "claude-code": { enabled: true }, "codex-cli": { enabled: false }, "gemini-cli": { enabled: false } },
    mcp: {},
    ide: { default: "cursor", workspaceName: "test" },
  };
}

function makeContext(hubDir: string): ComposedContext {
  return {
    hubDir,
    hubPreamble: "",
    projectTable: "",
    artifactsSection: "",
    context: "",
    contextFiles: [],
    commands: [],
    skills: [],
  };
}

describe("GitignoreGenerator", () => {
  let hubDir: string;

  beforeEach(() => {
    hubDir = mkdtempSync(join(tmpdir(), "meld-test-"));
  });

  afterEach(() => {
    rmSync(hubDir, { recursive: true, force: true });
  });

  const gen = new GitignoreGenerator();

  it("generates .gitignore with agents/ and scratch/", () => {
    const files = gen.generate(makeConfig(), makeContext(hubDir));
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe(".gitignore");
    expect(files[0].content).toContain("agents/");
    expect(files[0].content).toContain("scratch/");
  });

  it("preserves existing non-meld content", () => {
    writeFileSync(join(hubDir, ".gitignore"), "node_modules/\n.env\n");
    const files = gen.generate(makeConfig(), makeContext(hubDir));
    expect(files[0].content).toContain("node_modules/");
    expect(files[0].content).toContain("agents/");
  });

  it("replaces existing meld section", () => {
    const existing = [
      "node_modules/",
      "# ── meld managed (do not edit) ──",
      "old-stuff/",
      "# ── end meld managed ──",
      ".env",
    ].join("\n");
    writeFileSync(join(hubDir, ".gitignore"), existing);

    const files = gen.generate(makeConfig(), makeContext(hubDir));
    expect(files[0].content).toContain("agents/");
    expect(files[0].content).not.toContain("old-stuff/");
    expect(files[0].content).toContain(".env");
  });
});
