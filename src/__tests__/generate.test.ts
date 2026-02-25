import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generate } from "../generate.js";

describe("generate", () => {
  let hubDir: string;

  beforeEach(() => {
    hubDir = mkdtempSync(join(tmpdir(), "meld-test-"));
    mkdirSync(join(hubDir, "context"));
    writeFileSync(join(hubDir, "context", "rules.md"), "# Rules\n\nBe nice.");
  });

  afterEach(() => {
    rmSync(hubDir, { recursive: true, force: true });
  });

  const validConfig = {
    projects: { myapp: { path: "~/myapp", aliases: ["app"] } },
    agents: { "claude-code": { enabled: true }, "codex-cli": { enabled: false }, "gemini-cli": { enabled: false } },
    mcp: {},
    ide: { default: "cursor", workspaceName: "test" },
  };

  it("generates files for enabled agents", () => {
    writeFileSync(join(hubDir, "meld.jsonc"), JSON.stringify(validConfig));
    const result = generate(hubDir);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const paths = result.files.map((f) => f.path);
      expect(paths).toContain("agents/claude-code/CLAUDE.md");
      expect(paths).toContain("agents/claude-code/.mcp.json");
      expect(paths).toContain("agents/claude-code/.claude/settings.json");
    }
  });

  it("writes files to disk when not dry-run", () => {
    writeFileSync(join(hubDir, "meld.jsonc"), JSON.stringify(validConfig));
    generate(hubDir);
    expect(existsSync(join(hubDir, "agents/claude-code/CLAUDE.md"))).toBe(true);
  });

  it("does not write files in dry-run", () => {
    writeFileSync(join(hubDir, "meld.jsonc"), JSON.stringify(validConfig));
    generate(hubDir, { dryRun: true });
    expect(existsSync(join(hubDir, "agents/claude-code/CLAUDE.md"))).toBe(false);
  });

  it("filters to a single agent", () => {
    const config = { ...validConfig, agents: { "claude-code": { enabled: true }, "codex-cli": { enabled: true }, "gemini-cli": { enabled: false } } };
    writeFileSync(join(hubDir, "meld.jsonc"), JSON.stringify(config));
    const result = generate(hubDir, { agent: "claude-code" });
    if (result.ok) {
      const paths = result.files.map((f) => f.path);
      expect(paths.some((p) => p.includes("claude-code"))).toBe(true);
      expect(paths.some((p) => p.includes("codex"))).toBe(false);
    }
  });

  it("generates gitignore and workspace when not filtering", () => {
    writeFileSync(join(hubDir, "meld.jsonc"), JSON.stringify(validConfig));
    const result = generate(hubDir);
    if (result.ok) {
      const paths = result.files.map((f) => f.path);
      expect(paths).toContain(".gitignore");
      expect(paths).toContain("test.code-workspace");
    }
  });

  it("returns errors for invalid config", () => {
    writeFileSync(join(hubDir, "meld.jsonc"), JSON.stringify({}));
    const result = generate(hubDir);
    expect(result.ok).toBe(false);
  });
});
