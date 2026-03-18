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

  it("distributes external skills to all enabled agents", () => {
    const config = {
      ...validConfig,
      "enable-external-skills": true,
      agents: { "claude-code": { enabled: true }, "codex-cli": { enabled: true }, "gemini-cli": { enabled: false } },
    };
    writeFileSync(join(hubDir, "meld.jsonc"), JSON.stringify(config));

    // Local skill
    mkdirSync(join(hubDir, "skills", "my-local"), { recursive: true });
    writeFileSync(join(hubDir, "skills", "my-local", "SKILL.md"), "---\nname: my-local\ndescription: Local\n---\n\nLocal skill.");

    // External skill with extra files
    mkdirSync(join(hubDir, ".agents", "skills", "ext-skill", "rules"), { recursive: true });
    writeFileSync(join(hubDir, ".agents", "skills", "ext-skill", "SKILL.md"), "---\nname: ext-skill\ndescription: External\n---\n\nExternal skill.");
    writeFileSync(join(hubDir, ".agents", "skills", "ext-skill", "rules", "base.md"), "Base rules");

    const result = generate(hubDir);
    expect(result.ok).toBe(true);

    // Claude Code: local skill with meld- prefix
    expect(existsSync(join(hubDir, "agents/claude-code/.claude/skills/meld-my-local/SKILL.md"))).toBe(true);
    // Claude Code: external skill without prefix, including extra files
    expect(existsSync(join(hubDir, "agents/claude-code/.claude/skills/ext-skill/SKILL.md"))).toBe(true);
    expect(existsSync(join(hubDir, "agents/claude-code/.claude/skills/ext-skill/rules/base.md"))).toBe(true);

    // Codex: local skill with meld- prefix
    expect(existsSync(join(hubDir, "agents/codex/.agents/skills/meld-my-local/SKILL.md"))).toBe(true);
    // Codex: external skill without prefix
    expect(existsSync(join(hubDir, "agents/codex/.agents/skills/ext-skill/SKILL.md"))).toBe(true);
    expect(existsSync(join(hubDir, "agents/codex/.agents/skills/ext-skill/rules/base.md"))).toBe(true);
  });

  it("local skills still output as directories (single-file backward compat)", () => {
    writeFileSync(join(hubDir, "meld.jsonc"), JSON.stringify(validConfig));

    mkdirSync(join(hubDir, "skills", "simple"), { recursive: true });
    writeFileSync(join(hubDir, "skills", "simple", "SKILL.md"), "---\nname: simple\ndescription: Simple\n---\n\nSimple.");

    const result = generate(hubDir);
    expect(result.ok).toBe(true);
    expect(existsSync(join(hubDir, "agents/claude-code/.claude/skills/meld-simple/SKILL.md"))).toBe(true);
    const content = readFileSync(join(hubDir, "agents/claude-code/.claude/skills/meld-simple/SKILL.md"), "utf-8");
    expect(content).toContain("Simple.");
  });

  it("returns errors for invalid config", () => {
    writeFileSync(join(hubDir, "meld.jsonc"), JSON.stringify({}));
    const result = generate(hubDir);
    expect(result.ok).toBe(false);
  });
});
