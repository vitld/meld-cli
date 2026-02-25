import { describe, it, expect } from "vitest";
import { CodexCliGenerator } from "../codex-cli.js";
import type { MeldConfig } from "../../config/types.js";
import type { ComposedContext } from "../../context/types.js";

function makeConfig(overrides: Partial<MeldConfig> = {}): MeldConfig {
  return {
    projects: { myapp: { path: "~/myapp", aliases: ["app"] } },
    agents: { "claude-code": { enabled: false }, "codex-cli": { enabled: true }, "gemini-cli": { enabled: false } },
    mcp: {},
    ide: { default: "cursor", workspaceName: "test" },
    ...overrides,
  };
}

function makeContext(overrides: Partial<ComposedContext> = {}): ComposedContext {
  return {
    hubDir: "/tmp/hub",
    hubPreamble: "# Test Hub",
    projectTable: "## Projects\n\n| Project | Path |\n|--|--|\n| myapp | ~/myapp |",
    artifactsSection: "## Artifacts",
    context: "Rules here.",
    contextFiles: [],
    commands: [],
    skills: [],
    ...overrides,
  };
}

describe("CodexCliGenerator", () => {
  const gen = new CodexCliGenerator();

  it("generates AGENTS.md with all sections", () => {
    const files = gen.generate(makeConfig(), makeContext());
    const agents = files.find((f) => f.path === "AGENTS.md");
    expect(agents).toBeDefined();
    expect(agents!.content).toContain("Test Hub");
    expect(agents!.content).toContain("Rules here.");
  });

  it("generates .codex/config.toml with sensible sandbox defaults and MCP servers", () => {
    const config = makeConfig({
      projects: {
        myapp: { path: "~/myapp", aliases: ["app"] },
        another: { path: "~/another", aliases: [] },
      },
      mcp: {
        shared: { command: "npx", args: ["-y", "mcp-server"] },
        other: { command: "npx", args: [], agents: ["claude-code"] },
      },
    });

    const files = gen.generate(config, makeContext());
    const toml = files.find((f) => f.path === ".codex/config.toml");
    expect(toml).toBeDefined();
    expect(toml!.content).toContain('approval_policy = "on-request"');
    expect(toml!.content).toContain('sandbox_mode = "workspace-write"');
    expect(toml!.content).toContain('writable_roots = ["/tmp/hub", "~/myapp", "~/another"]');
    expect(toml!.content).toContain("[mcp_servers.shared]");
    expect(toml!.content).not.toContain("[mcp_servers.other]");
  });

  it("generates .codex/config.toml with HTTP MCP servers", () => {
    const config = makeConfig({
      mcp: {
        ctx: { type: "http", url: "https://mcp.example.com/mcp", headers: { Authorization: "Bearer tok" }, env: { API_KEY: "sk" } },
        local: { command: "node", args: ["server.js"] },
      },
    });
    const files = gen.generate(config, makeContext());
    const toml = files.find((f) => f.path === ".codex/config.toml");
    expect(toml).toBeDefined();
    expect(toml!.content).toContain("[mcp_servers.ctx]");
    expect(toml!.content).toContain('url = "https://mcp.example.com/mcp"');
    expect(toml!.content).toContain("[mcp_servers.ctx.http_headers]");
    expect(toml!.content).toContain('Authorization = "Bearer tok"');
    expect(toml!.content).toContain("[mcp_servers.ctx.env]");
    expect(toml!.content).toContain('API_KEY = "sk"');
    expect(toml!.content).toContain("[mcp_servers.local]");
    expect(toml!.content).toContain('command = "node"');
  });

  it("applies codex overrides", () => {
    const config = makeConfig({
      agents: {
        "claude-code": { enabled: false },
        "codex-cli": {
          enabled: true,
          overrides: {
            approval_policy: "never",
            sandbox_workspace_write: {
              network_access: true,
              writable_roots: ["/custom/root"],
            },
          },
        },
        "gemini-cli": { enabled: false },
      },
    });

    const files = gen.generate(config, makeContext());
    const toml = files.find((f) => f.path === ".codex/config.toml");
    expect(toml!.content).toContain('approval_policy = "never"');
    expect(toml!.content).toContain('network_access = true');
    expect(toml!.content).toContain('writable_roots = ["/custom/root"]');
  });

  it("generates commands as .agents/skills/meld-cmd-*/SKILL.md", () => {
    const ctx = makeContext({ commands: [{ name: "review", content: "Do review" }] });
    const files = gen.generate(makeConfig(), ctx);
    const cmd = files.find((f) => f.path === ".agents/skills/meld-cmd-review/SKILL.md");
    expect(cmd).toBeDefined();
    expect(cmd!.content).toContain("Do review");
  });

  it("generates skills as .agents/skills/meld-*/SKILL.md with codex model", () => {
    const ctx = makeContext({
      skills: [{
        name: "deep-review",
        frontmatter: { name: "deep-review", description: "Review", model: { "claude-code": "opus", "codex-cli": "o3" } },
        body: "Review code.",
      }],
    });
    const files = gen.generate(makeConfig(), ctx);
    const skill = files.find((f) => f.path === ".agents/skills/meld-deep-review/SKILL.md");
    expect(skill).toBeDefined();
    expect(skill!.content).toContain("model: o3");
    expect(skill!.content).not.toContain("claude-code");
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
