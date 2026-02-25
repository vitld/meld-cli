import { describe, it, expect, vi, afterEach } from "vitest";
import { interpolateEnv } from "../interpolate.js";
import type { MeldConfig } from "../types.js";

function makeConfig(mcp: MeldConfig["mcp"] = {}): MeldConfig {
  return {
    projects: {},
    agents: { "claude-code": { enabled: true }, "codex-cli": { enabled: false }, "gemini-cli": { enabled: false } },
    mcp,
    ide: { default: "cursor", workspaceName: "test" },
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("interpolateEnv", () => {
  it("resolves ${VAR} in string values", () => {
    vi.stubEnv("MY_TOKEN", "secret123");
    const config = makeConfig({
      srv: { type: "http", url: "https://example.com", headers: { Authorization: "Bearer ${MY_TOKEN}" } },
    });
    const { config: resolved, warnings } = interpolateEnv(config);
    expect(resolved.mcp.srv).toHaveProperty("headers", { Authorization: "Bearer secret123" });
    expect(warnings).toHaveLength(0);
  });

  it("resolves multiple vars in one string", () => {
    vi.stubEnv("SCHEME", "https");
    vi.stubEnv("HOST", "api.example.com");
    const config = makeConfig({
      srv: { type: "http", url: "${SCHEME}://${HOST}/mcp" },
    });
    const { config: resolved } = interpolateEnv(config);
    expect(resolved.mcp.srv).toHaveProperty("url", "https://api.example.com/mcp");
  });

  it("warns and preserves placeholder for missing env vars", () => {
    const config = makeConfig({
      srv: { type: "http", url: "https://example.com", headers: { "x-key": "${MISSING_VAR}" } },
    });
    const { config: resolved, warnings } = interpolateEnv(config);
    expect(resolved.mcp.srv).toHaveProperty("headers", { "x-key": "${MISSING_VAR}" });
    expect(warnings).toEqual(["Environment variable not set: MISSING_VAR"]);
  });

  it("handles mixed resolved and unresolved vars", () => {
    vi.stubEnv("FOUND", "yes");
    const config = makeConfig({
      srv: { type: "http", url: "${FOUND}/${NOT_FOUND}" },
    });
    const { config: resolved, warnings } = interpolateEnv(config);
    expect(resolved.mcp.srv).toHaveProperty("url", "yes/${NOT_FOUND}");
    expect(warnings).toEqual(["Environment variable not set: NOT_FOUND"]);
  });

  it("does not modify non-string values", () => {
    const config: MeldConfig = {
      projects: {},
      agents: { "claude-code": { enabled: true }, "codex-cli": { enabled: false }, "gemini-cli": { enabled: false } },
      mcp: {},
      ide: { default: "cursor", workspaceName: "test" },
    };
    const { config: resolved } = interpolateEnv(config);
    expect(resolved.agents["claude-code"].enabled).toBe(true);
    expect(resolved.agents["codex-cli"].enabled).toBe(false);
  });

  it("resolves vars in nested objects", () => {
    vi.stubEnv("API_KEY", "key123");
    const config = makeConfig({
      srv: { command: "node", args: ["server.js"], env: { API_KEY: "${API_KEY}" } },
    });
    const { config: resolved, warnings } = interpolateEnv(config);
    expect(resolved.mcp.srv).toHaveProperty("env", { API_KEY: "key123" });
    expect(warnings).toHaveLength(0);
  });

  it("resolves vars in arrays", () => {
    vi.stubEnv("SCRIPT", "run.js");
    const config = makeConfig({
      srv: { command: "node", args: ["${SCRIPT}", "--flag"] },
    });
    const { config: resolved } = interpolateEnv(config);
    expect(resolved.mcp.srv).toHaveProperty("args", ["run.js", "--flag"]);
  });

  it("passes through strings without env var syntax unchanged", () => {
    const config = makeConfig({
      srv: { command: "npx", args: ["-y", "server"] },
    });
    const { config: resolved, warnings } = interpolateEnv(config);
    expect(resolved.mcp.srv).toHaveProperty("command", "npx");
    expect(resolved.mcp.srv).toHaveProperty("args", ["-y", "server"]);
    expect(warnings).toHaveLength(0);
  });

  it("resolves vars in project paths", () => {
    vi.stubEnv("HOME", "/Users/test");
    const config: MeldConfig = {
      projects: { myapp: { path: "${HOME}/myapp", aliases: ["app"] } },
      agents: { "claude-code": { enabled: true }, "codex-cli": { enabled: false }, "gemini-cli": { enabled: false } },
      mcp: {},
      ide: { default: "cursor", workspaceName: "test" },
    };
    const { config: resolved } = interpolateEnv(config);
    expect(resolved.projects.myapp.path).toBe("/Users/test/myapp");
  });
});
