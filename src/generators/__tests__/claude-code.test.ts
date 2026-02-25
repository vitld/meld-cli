import { describe, it, expect } from "vitest";
import { ClaudeCodeGenerator } from "../claude-code.js";
import type { MeldConfig } from "../../config/types.js";
import type { ComposedContext } from "../../context/types.js";

function makeConfig(overrides: Partial<MeldConfig> = {}): MeldConfig {
  return {
    projects: {
      myapp: { path: "~/myapp", aliases: ["app"] },
    },
    agents: { "claude-code": { enabled: true }, "codex-cli": { enabled: false }, "gemini-cli": { enabled: false } },
    mcp: {},
    ide: { default: "cursor", workspaceName: "test" },
    ...overrides,
  };
}

function makeContext(overrides: Partial<ComposedContext> = {}): ComposedContext {
  return {
    hubDir: "/tmp/hub",
    hubPreamble: "# Test Hub\n\nPreamble.",
    projectTable: "## Projects\n\n| Project | Aliases | Path | Repo |\n|--|--|--|--|\n| myapp | app | ~/myapp |  |",
    artifactsSection: "## Artifacts\n\n- Hub: `../../artifacts/hub/`",
    context: "Some context rules.",
    contextFiles: [],
    commands: [],
    skills: [],
    ...overrides,
  };
}

describe("ClaudeCodeGenerator", () => {
  const gen = new ClaudeCodeGenerator();

  it("generates CLAUDE.md with all sections", () => {
    const files = gen.generate(makeConfig(), makeContext());
    const claudeMd = files.find((f) => f.path === "CLAUDE.md");
    expect(claudeMd).toBeDefined();
    expect(claudeMd!.content).toContain("Test Hub");
    expect(claudeMd!.content).toContain("Projects");
    expect(claudeMd!.content).toContain("Artifacts");
    expect(claudeMd!.content).toContain("Some context rules.");
  });

  it("generates .mcp.json filtering by agent scope", () => {
    const config = makeConfig({
      mcp: {
        shared: { command: "npx", args: ["-y", "shared-mcp"] },
        other: { command: "npx", args: ["-y", "other-mcp"], agents: ["codex-cli"] },
      },
    });
    const files = gen.generate(config, makeContext());
    const mcp = files.find((f) => f.path === ".mcp.json");
    expect(mcp).toBeDefined();
    const parsed = JSON.parse(mcp!.content);
    expect(parsed.mcpServers.shared).toBeDefined();
    expect(parsed.mcpServers.other).toBeUndefined();
  });

  it("generates .mcp.json with HTTP MCP servers", () => {
    const config = makeConfig({
      mcp: {
        ctx: { type: "http", url: "https://mcp.example.com/mcp", headers: { Authorization: "Bearer tok" }, env: { API_KEY: "sk" } },
        local: { command: "node", args: ["server.js"], env: { KEY: "val" } },
      },
    });
    const files = gen.generate(config, makeContext());
    const mcp = files.find((f) => f.path === ".mcp.json");
    const parsed = JSON.parse(mcp!.content);
    // HTTP server: type + url + headers + env, no command/args
    expect(parsed.mcpServers.ctx).toEqual({ type: "http", url: "https://mcp.example.com/mcp", headers: { Authorization: "Bearer tok" }, env: { API_KEY: "sk" } });
    // Stdio server: command + args + env, no type
    expect(parsed.mcpServers.local).toEqual({ command: "node", args: ["server.js"], env: { KEY: "val" } });
    expect(parsed.mcpServers.local.type).toBeUndefined();
  });

  it("generates commands as .claude/commands/meld/*.md", () => {
    const ctx = makeContext({ commands: [{ name: "review", content: "Do review" }] });
    const files = gen.generate(makeConfig(), ctx);
    const cmd = files.find((f) => f.path === ".claude/commands/meld/review.md");
    expect(cmd).toBeDefined();
    expect(cmd!.content).toBe("Do review");
  });

  it("generates skills as .claude/skills/meld-*/SKILL.md", () => {
    const ctx = makeContext({
      skills: [{
        name: "deep-review",
        frontmatter: { name: "deep-review", description: "Review", model: { "claude-code": "claude-opus-4-6", "codex-cli": "o3" } },
        body: "Review thoroughly.",
      }],
    });
    const files = gen.generate(makeConfig(), ctx);
    const skill = files.find((f) => f.path === ".claude/skills/meld-deep-review/SKILL.md");
    expect(skill).toBeDefined();
    expect(skill!.content).toContain("name: deep-review");
    expect(skill!.content).toContain("model: claude-opus-4-6");
    expect(skill!.content).not.toContain("codex");
    expect(skill!.content).toContain("Review thoroughly.");
  });

  it("generates .claude/settings.json with permissions", () => {
    const config = makeConfig({
      projects: {
        myapp: { path: "~/myapp", aliases: ["app"] },
        other: { path: "~/other", aliases: [] },
      },
    });
    const files = gen.generate(config, makeContext());
    const settings = files.find((f) => f.path === ".claude/settings.json");
    expect(settings).toBeDefined();
    const parsed = JSON.parse(settings!.content);

    // Env
    expect(parsed.env.ENABLE_TOOL_SEARCH).toBe("true");

    // Non-destructive tools (not path-scoped)
    expect(parsed.permissions.allow).toContain("Task");
    expect(parsed.permissions.allow).toContain("WebSearch");
    expect(parsed.permissions.allow).toContain("WebFetch");
    expect(parsed.permissions.allow).toContain("ToolSearch");

    // Non-destructive Bash commands (not path-scoped)
    expect(parsed.permissions.allow).toContain("Bash(command:cd *)");
    expect(parsed.permissions.allow).toContain("Bash(command:ls *)");
    expect(parsed.permissions.allow).toContain("Bash(command:mkdir *)");
    expect(parsed.permissions.allow).toContain("Bash(command:git *)");
    expect(parsed.permissions.allow).toContain("Bash(command:node *)");

    // Hub root permissions (Read, Glob, Grep, Write, Edit)
    expect(parsed.permissions.allow).toContain("Read(///tmp/hub/**)");
    expect(parsed.permissions.allow).toContain("Glob(///tmp/hub/**)");
    expect(parsed.permissions.allow).toContain("Grep(///tmp/hub/**)");
    expect(parsed.permissions.allow).toContain("Write(///tmp/hub/**)");
    expect(parsed.permissions.allow).toContain("Edit(///tmp/hub/**)");

    // Per-project scoped permissions
    expect(parsed.permissions.allow).toContain("Read(//~/myapp/**)");
    expect(parsed.permissions.allow).toContain("Glob(//~/myapp/**)");
    expect(parsed.permissions.allow).toContain("Grep(//~/myapp/**)");
    expect(parsed.permissions.allow).toContain("Write(//~/myapp/**)");
    expect(parsed.permissions.allow).toContain("Edit(//~/myapp/**)");
    expect(parsed.permissions.allow).toContain("Read(//~/other/**)");
    expect(parsed.permissions.allow).toContain("Glob(//~/other/**)");
    expect(parsed.permissions.allow).toContain("Grep(//~/other/**)");
    expect(parsed.permissions.allow).toContain("Write(//~/other/**)");
    expect(parsed.permissions.allow).toContain("Edit(//~/other/**)");

    // Additional directories for Bash access
    expect(parsed.permissions.additionalDirectories).toContain("~/myapp");
    expect(parsed.permissions.additionalDirectories).toContain("~/other");

    // No plugins key
    expect(parsed.enabledPlugins).toBeUndefined();
  });

  it("omits model from skill when agent not in model map", () => {
    const ctx = makeContext({
      skills: [{
        name: "test-skill",
        frontmatter: { name: "test-skill", description: "Test", model: { "codex-cli": "o3" } },
        body: "Body.",
      }],
    });
    const files = gen.generate(makeConfig(), ctx);
    const skill = files.find((f) => f.path === ".claude/skills/meld-test-skill/SKILL.md");
    expect(skill).toBeDefined();
    expect(skill!.content).not.toContain("model:");
  });

  it("passes through string model", () => {
    const ctx = makeContext({
      skills: [{
        name: "test-skill",
        frontmatter: { name: "test-skill", description: "Test", model: "claude-opus-4-6" },
        body: "Body.",
      }],
    });
    const files = gen.generate(makeConfig(), ctx);
    const skill = files.find((f) => f.path === ".claude/skills/meld-test-skill/SKILL.md");
    expect(skill!.content).toContain("model: claude-opus-4-6");
  });

  it("emits contextFiles as generated files", () => {
    const ctx = makeContext({
      contextFiles: [
        { path: "reference/api.md", content: "API docs" },
        { path: "guides/setup.md", content: "Setup" },
      ],
    });
    const files = gen.generate(makeConfig(), ctx);
    const api = files.find((f) => f.path === "reference/api.md");
    const setup = files.find((f) => f.path === "guides/setup.md");
    expect(api).toBeDefined();
    expect(api!.content).toBe("API docs");
    expect(setup).toBeDefined();
    expect(setup!.content).toBe("Setup");
  });

});
