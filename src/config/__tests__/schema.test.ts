import { describe, it, expect } from "vitest";
import { validateConfig } from "../schema.js";

const minimal = {
  projects: {},
  agents: { "claude-code": { enabled: true }, "codex-cli": { enabled: false }, "gemini-cli": { enabled: false } },
  mcp: {},
  ide: { default: "cursor", workspaceName: "test" },
};

describe("validateConfig", () => {
  it("accepts minimal valid config", () => {
    const result = validateConfig(minimal);
    expect(result.ok).toBe(true);
  });

  it("rejects non-object", () => {
    const result = validateConfig("string");
    expect(result.ok).toBe(false);
  });

  it("requires top-level keys", () => {
    const result = validateConfig({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Missing required key: projects");
      expect(result.errors).toContain("Missing required key: agents");
      expect(result.errors).toContain("Missing required key: mcp");
      expect(result.errors).toContain("Missing required key: ide");
    }
  });

  it("rejects invalid agent names", () => {
    const result = validateConfig({ ...minimal, agents: { ...minimal.agents, copilot: { enabled: true } } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("copilot");
    }
  });

  it("rejects invalid MCP agent scope", () => {
    const result = validateConfig({
      ...minimal,
      mcp: { server1: { command: "x", args: [], agents: ["invalid"] } },
    });
    expect(result.ok).toBe(false);
  });

  it("accepts HTTP MCP server", () => {
    const result = validateConfig({
      ...minimal,
      mcp: { ctx: { type: "http", url: "https://mcp.example.com/mcp" } },
    });
    expect(result.ok).toBe(true);
  });

  it("rejects HTTP MCP server without url", () => {
    const result = validateConfig({
      ...minimal,
      mcp: { ctx: { type: "http" } },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("url");
    }
  });

  it("rejects stdio MCP server without command", () => {
    const result = validateConfig({
      ...minimal,
      mcp: { srv: { args: [] } },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("command");
    }
  });

  it("rejects stdio MCP server without args", () => {
    const result = validateConfig({
      ...minimal,
      mcp: { srv: { command: "node" } },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("args");
    }
  });

  it("accepts config with projects", () => {
    const result = validateConfig({
      ...minimal,
      projects: {
        myapp: { path: "~/myapp", aliases: ["app"], repo: "org/myapp" },
      },
    });
    expect(result.ok).toBe(true);
  });

  it("accepts optional context string", () => {
    const result = validateConfig({ ...minimal, context: "./my-context/" });
    expect(result.ok).toBe(true);
  });

  it("rejects non-string context", () => {
    const result = validateConfig({ ...minimal, context: { shared: "./x/" } });
    expect(result.ok).toBe(false);
  });

  it("does not require git key", () => {
    const result = validateConfig(minimal);
    expect(result.ok).toBe(true);
  });
});
