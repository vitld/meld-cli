import { describe, it, expect } from "vitest";
import { validateConfig } from "../schema.js";

const minimal = {
  projects: {},
  agents: { "claude-code": { enabled: true }, "codex-cli": { enabled: false }, "gemini-cli": { enabled: false } },
  mcp: {},
  ide: { default: "cursor", workspaceName: "test" },
};

describe("agent overrides schema", () => {
  it("accepts agent overrides object", () => {
    const result = validateConfig({
      ...minimal,
      agents: {
        ...minimal.agents,
        "codex-cli": { enabled: false, overrides: { sandbox_mode: "workspace-write" } },
      },
    });
    expect(result.ok).toBe(true);
  });

  it("rejects non-object agent overrides", () => {
    const result = validateConfig({
      ...minimal,
      agents: { ...minimal.agents, "codex-cli": { enabled: false, overrides: "nope" } },
    });
    expect(result.ok).toBe(false);
  });
});
