import { describe, it, expect } from "vitest";
import { resolveAgentDir, resolveContextPath, AGENTS_DIR, DEFAULT_AGENT_DIRS } from "../types.js";

describe("config types", () => {
  it("has correct default agent dirs", () => {
    expect(DEFAULT_AGENT_DIRS).toEqual({
      "claude-code": "claude-code",
      "codex-cli": "codex",
      "gemini-cli": "gemini",
    });
  });

  it("resolves agent dir from config override", () => {
    expect(resolveAgentDir("claude-code", { enabled: true, dir: "my-claude" })).toBe("my-claude");
  });

  it("resolves agent dir from defaults", () => {
    expect(resolveAgentDir("claude-code", { enabled: true })).toBe("claude-code");
  });

  it("resolves default context path", () => {
    expect(resolveContextPath()).toBe("./context/");
  });

  it("resolves custom context path", () => {
    expect(resolveContextPath("./my-context/")).toBe("./my-context/");
  });
});
