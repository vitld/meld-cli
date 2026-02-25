import { describe, it, expect } from "vitest";
import { GeminiCliGenerator } from "../gemini-cli.js";
import type { MeldConfig } from "../../config/types.js";
import type { ComposedContext } from "../../context/types.js";

function makeConfig(overrides: Partial<MeldConfig> = {}): MeldConfig {
  return {
    projects: { myapp: { path: "~/myapp", aliases: ["app"] } },
    agents: { "claude-code": { enabled: false }, "codex-cli": { enabled: false }, "gemini-cli": { enabled: true } },
    mcp: {},
    ide: { default: "cursor", workspaceName: "test" },
    ...overrides,
  };
}

function makeContext(overrides: Partial<ComposedContext> = {}): ComposedContext {
  return {
    hubDir: "/tmp/hub",
    hubPreamble: "# Test Hub",
    projectTable: "## Projects table",
    artifactsSection: "## Artifacts",
    context: "Rules here.",
    contextFiles: [],
    commands: [],
    skills: [],
    ...overrides,
  };
}

describe("GeminiCliGenerator", () => {
  const gen = new GeminiCliGenerator();

  it("generates GEMINI.md with all sections", () => {
    const files = gen.generate(makeConfig(), makeContext());
    const md = files.find((f) => f.path === "GEMINI.md");
    expect(md).toBeDefined();
    expect(md!.content).toContain("Test Hub");
    expect(md!.content).toContain("Rules here.");
  });

  it("generates .gemini/settings.json filtering by agent scope", () => {
    const config = makeConfig({
      mcp: {
        shared: { command: "npx", args: ["-y", "mcp"] },
        other: { command: "npx", args: [], agents: ["claude-code"] },
      },
    });
    const files = gen.generate(config, makeContext());
    const settings = files.find((f) => f.path === ".gemini/settings.json");
    expect(settings).toBeDefined();
    const parsed = JSON.parse(settings!.content);
    expect(parsed.mcpServers.shared).toBeDefined();
    expect(parsed.mcpServers.other).toBeUndefined();
  });

  it("generates .gemini/settings.json with HTTP MCP servers", () => {
    const config = makeConfig({
      mcp: {
        ctx: { type: "http", url: "https://mcp.example.com/mcp", headers: { "x-key": "val" }, env: { API_KEY: "sk" } },
        local: { command: "node", args: ["server.js"] },
      },
    });
    const files = gen.generate(config, makeContext());
    const settings = files.find((f) => f.path === ".gemini/settings.json");
    const parsed = JSON.parse(settings!.content);
    expect(parsed.mcpServers.ctx).toEqual({ type: "http", url: "https://mcp.example.com/mcp", headers: { "x-key": "val" }, env: { API_KEY: "sk" } });
    expect(parsed.mcpServers.local).toEqual({ command: "node", args: ["server.js"] });
    expect(parsed.mcpServers.local.type).toBeUndefined();
  });

  it("generates commands as .gemini/commands/meld/*.toml", () => {
    const ctx = makeContext({ commands: [{ name: "review", content: "Do review" }] });
    const files = gen.generate(makeConfig(), ctx);
    const cmd = files.find((f) => f.path === ".gemini/commands/meld/review.toml");
    expect(cmd).toBeDefined();
    expect(cmd!.content).toContain("Do review");
  });

  it("generates skills as .gemini/commands/meld/*.toml (best-effort)", () => {
    const ctx = makeContext({
      skills: [{
        name: "deep-review",
        frontmatter: { name: "deep-review", description: "Review", model: { "gemini-cli": "gemini-2.5-pro" } },
        body: "Review code.",
      }],
    });
    const files = gen.generate(makeConfig(), ctx);
    const skill = files.find((f) => f.path === ".gemini/commands/meld/deep-review.toml");
    expect(skill).toBeDefined();
    expect(skill!.content).toContain("deep-review");
    expect(skill!.content).toContain("Review code.");
  });

  it("emits contextFiles as generated files", () => {
    const ctx = makeContext({
      contextFiles: [
        { path: "reference/api.md", content: "API docs" },
      ],
    });
    const files = gen.generate(makeConfig(), ctx);
    const api = files.find((f) => f.path === "reference/api.md");
    expect(api).toBeDefined();
    expect(api!.content).toBe("API docs");
  });

});
