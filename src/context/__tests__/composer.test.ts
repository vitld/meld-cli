import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { composeContext } from "../composer.js";
import type { MeldConfig } from "../../config/types.js";

function makeConfig(overrides: Partial<MeldConfig> = {}): MeldConfig {
  return {
    projects: {},
    agents: { "claude-code": { enabled: true }, "codex-cli": { enabled: false }, "gemini-cli": { enabled: false } },
    mcp: {},
    ide: { default: "cursor", workspaceName: "test-hub" },
    ...overrides,
  };
}

describe("composeContext", () => {
  let hubDir: string;

  beforeEach(() => {
    hubDir = mkdtempSync(join(tmpdir(), "meld-test-"));
  });

  afterEach(() => {
    rmSync(hubDir, { recursive: true, force: true });
  });

  it("reads context markdown files sorted alphabetically", () => {
    mkdirSync(join(hubDir, "context"));
    writeFileSync(join(hubDir, "context", "b-second.md"), "Second");
    writeFileSync(join(hubDir, "context", "a-first.md"), "First");

    const ctx = composeContext(hubDir, makeConfig());
    expect(ctx.context).toBe("First\n\nSecond");
  });

  it("handles missing context directory", () => {
    const ctx = composeContext(hubDir, makeConfig());
    expect(ctx.context).toBe("");
  });

  it("uses custom context path", () => {
    mkdirSync(join(hubDir, "my-context"));
    writeFileSync(join(hubDir, "my-context", "rules.md"), "My rules");

    const ctx = composeContext(hubDir, makeConfig({ context: "./my-context/" }));
    expect(ctx.context).toBe("My rules");
  });

  it("builds hub preamble with workspace name and hub structure", () => {
    const ctx = composeContext(hubDir, makeConfig());
    expect(ctx.hubPreamble).toContain("test-hub");
    expect(ctx.hubPreamble).toContain("meld hub");
    expect(ctx.hubPreamble).toContain("## Hub Structure");
    expect(ctx.hubPreamble).toContain("meld.jsonc");
    expect(ctx.hubPreamble).toContain("context/");
    expect(ctx.hubPreamble).toContain("commands/");
    expect(ctx.hubPreamble).toContain("skills/");
    expect(ctx.hubPreamble).toContain("artifacts/");
    expect(ctx.hubPreamble).toContain("scratch/");
    expect(ctx.hubPreamble).toContain("agents/");
    expect(ctx.hubPreamble).toContain("do not edit");
    expect(ctx.hubPreamble).toContain("meld gen");
  });

  it("builds project table", () => {
    const config = makeConfig({
      projects: {
        myapp: { path: "~/myapp", aliases: ["app", "my"], repo: "org/myapp" },
      },
    });
    const ctx = composeContext(hubDir, config);
    expect(ctx.projectTable).toContain("myapp");
    expect(ctx.projectTable).toContain("app, my");
    expect(ctx.projectTable).toContain("~/myapp");
    expect(ctx.projectTable).toContain("org/myapp");
  });

  it("builds artifacts section with pattern-based paths", () => {
    const ctx = composeContext(hubDir, makeConfig());
    expect(ctx.artifactsSection).toContain("artifacts/hub/");
    expect(ctx.artifactsSection).toContain("artifacts/projects/{project-name}/");
    expect(ctx.artifactsSection).toContain("scratch/");
  });

  it("reads commands from commands/ directory", () => {
    mkdirSync(join(hubDir, "commands"));
    writeFileSync(join(hubDir, "commands", "review.md"), "Do a review");

    const ctx = composeContext(hubDir, makeConfig());
    expect(ctx.commands).toHaveLength(1);
    expect(ctx.commands[0].name).toBe("review");
    expect(ctx.commands[0].content).toBe("Do a review");
  });

  it("reads skills from skills/ directory", () => {
    mkdirSync(join(hubDir, "skills", "deep-review"), { recursive: true });
    writeFileSync(join(hubDir, "skills", "deep-review", "SKILL.md"), [
      "---",
      "name: deep-review",
      "description: Thorough code review",
      "model:",
      "  claude-code: claude-opus-4-6",
      "  codex-cli: o3",
      "---",
      "",
      "Review the code thoroughly.",
    ].join("\n"));

    const ctx = composeContext(hubDir, makeConfig());
    expect(ctx.skills).toHaveLength(1);
    expect(ctx.skills[0].name).toBe("deep-review");
    expect(ctx.skills[0].frontmatter.name).toBe("deep-review");
    expect(ctx.skills[0].frontmatter.description).toBe("Thorough code review");
    expect(ctx.skills[0].frontmatter.model).toEqual({ "claude-code": "claude-opus-4-6", "codex-cli": "o3" });
    expect(ctx.skills[0].body).toContain("Review the code thoroughly.");
  });

  it("skips skill folders without SKILL.md", () => {
    mkdirSync(join(hubDir, "skills", "empty"), { recursive: true });

    const ctx = composeContext(hubDir, makeConfig());
    expect(ctx.skills).toHaveLength(0);
  });

  it("only reads .md files from context root (not other files)", () => {
    mkdirSync(join(hubDir, "context"));
    writeFileSync(join(hubDir, "context", "rules.md"), "Rules");
    writeFileSync(join(hubDir, "context", "notes.txt"), "Notes");

    const ctx = composeContext(hubDir, makeConfig());
    expect(ctx.context).toBe("Rules");
  });

  it("returns empty contextFiles when no subfolders exist", () => {
    mkdirSync(join(hubDir, "context"));
    writeFileSync(join(hubDir, "context", "rules.md"), "Rules");

    const ctx = composeContext(hubDir, makeConfig());
    expect(ctx.contextFiles).toEqual([]);
  });

  it("returns empty contextFiles when context dir is missing", () => {
    const ctx = composeContext(hubDir, makeConfig());
    expect(ctx.contextFiles).toEqual([]);
  });

  it("collects subfolder files as contextFiles with relative paths", () => {
    mkdirSync(join(hubDir, "context", "reference"), { recursive: true });
    writeFileSync(join(hubDir, "context", "reference", "api.md"), "API docs");
    writeFileSync(join(hubDir, "context", "reference", "patterns.md"), "Patterns");

    const ctx = composeContext(hubDir, makeConfig());
    expect(ctx.contextFiles).toHaveLength(2);
    expect(ctx.contextFiles).toContainEqual({ path: "reference/api.md", content: "API docs" });
    expect(ctx.contextFiles).toContainEqual({ path: "reference/patterns.md", content: "Patterns" });
  });

  it("collects nested subfolder files", () => {
    mkdirSync(join(hubDir, "context", "reference", "api"), { recursive: true });
    writeFileSync(join(hubDir, "context", "reference", "api", "endpoints.md"), "Endpoints");

    const ctx = composeContext(hubDir, makeConfig());
    expect(ctx.contextFiles).toHaveLength(1);
    expect(ctx.contextFiles[0]).toEqual({ path: "reference/api/endpoints.md", content: "Endpoints" });
  });

  it("collects non-.md files in subfolders", () => {
    mkdirSync(join(hubDir, "context", "assets"), { recursive: true });
    writeFileSync(join(hubDir, "context", "assets", "config.json"), '{"key": "value"}');
    writeFileSync(join(hubDir, "context", "assets", "notes.txt"), "Notes");

    const ctx = composeContext(hubDir, makeConfig());
    expect(ctx.contextFiles).toHaveLength(2);
    expect(ctx.contextFiles).toContainEqual({ path: "assets/config.json", content: '{"key": "value"}' });
    expect(ctx.contextFiles).toContainEqual({ path: "assets/notes.txt", content: "Notes" });
  });

  it("handles mixed root files and subfolders", () => {
    mkdirSync(join(hubDir, "context", "guides"), { recursive: true });
    writeFileSync(join(hubDir, "context", "01-rules.md"), "Rules");
    writeFileSync(join(hubDir, "context", "guides", "setup.md"), "Setup guide");

    const ctx = composeContext(hubDir, makeConfig());
    expect(ctx.context).toBe("Rules");
    expect(ctx.contextFiles).toHaveLength(1);
    expect(ctx.contextFiles[0]).toEqual({ path: "guides/setup.md", content: "Setup guide" });
  });

  it("collects subfolders from custom context path", () => {
    mkdirSync(join(hubDir, "my-context", "ref"), { recursive: true });
    writeFileSync(join(hubDir, "my-context", "rules.md"), "My rules");
    writeFileSync(join(hubDir, "my-context", "ref", "doc.md"), "Doc");

    const ctx = composeContext(hubDir, makeConfig({ context: "./my-context/" }));
    expect(ctx.context).toBe("My rules");
    expect(ctx.contextFiles).toHaveLength(1);
    expect(ctx.contextFiles[0]).toEqual({ path: "ref/doc.md", content: "Doc" });
  });
});
