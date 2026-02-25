import { describe, it, expect } from "vitest";
import { ClaudeCodeGenerator } from "../claude-code.js";
import { GeminiCliGenerator } from "../gemini-cli.js";
import type { MeldConfig } from "../../config/types.js";
import type { ComposedContext } from "../../context/types.js";

const context: ComposedContext = {
  hubDir: "/tmp/hub",
  hubPreamble: "# Test Hub",
  projectTable: "## Projects",
  artifactsSection: "## Artifacts",
  context: "Rules",
  contextFiles: [],
  commands: [],
  skills: [],
};

describe("agent overrides", () => {
  it("applies claude settings overrides", () => {
    const config: MeldConfig = {
      projects: { myapp: { path: "~/myapp", aliases: ["app"] } },
      agents: {
        "claude-code": {
          enabled: true,
          overrides: {
            env: { ENABLE_TOOL_SEARCH: "false" },
            customSetting: "value",
          },
        },
        "codex-cli": { enabled: false },
        "gemini-cli": { enabled: false },
      },
      mcp: {},
      ide: { default: "cursor", workspaceName: "test" },
    };

    const files = new ClaudeCodeGenerator().generate(config, context);
    const settings = files.find((f) => f.path === ".claude/settings.json");
    expect(settings).toBeDefined();

    const parsed = JSON.parse(settings!.content);
    expect(parsed.env.ENABLE_TOOL_SEARCH).toBe("false");
    expect(parsed.customSetting).toBe("value");
  });

  it("applies gemini settings overrides", () => {
    const config: MeldConfig = {
      projects: { myapp: { path: "~/myapp", aliases: ["app"] } },
      agents: {
        "claude-code": { enabled: false },
        "codex-cli": { enabled: false },
        "gemini-cli": {
          enabled: true,
          overrides: {
            tools: {
              webSearch: true,
            },
          },
        },
      },
      mcp: {},
      ide: { default: "cursor", workspaceName: "test" },
    };

    const files = new GeminiCliGenerator().generate(config, context);
    const settings = files.find((f) => f.path === ".gemini/settings.json");
    expect(settings).toBeDefined();

    const parsed = JSON.parse(settings!.content);
    expect(parsed.tools.webSearch).toBe(true);
  });
});
