import { describe, it, expect } from "vitest";
import { WorkspaceGenerator } from "../workspace.js";
import type { MeldConfig } from "../../config/types.js";
import type { ComposedContext } from "../../context/types.js";

function makeConfig(overrides: Partial<MeldConfig> = {}): MeldConfig {
  return {
    projects: {
      myapp: { path: "~/myapp", aliases: ["app"] },
      other: { path: "~/other", aliases: [] },
    },
    agents: { "claude-code": { enabled: true }, "codex-cli": { enabled: false }, "gemini-cli": { enabled: false } },
    mcp: {},
    ide: { default: "cursor", workspaceName: "test-hub" },
    ...overrides,
  };
}

function makeContext(): ComposedContext {
  return {
    hubDir: "/tmp/hub",
    hubPreamble: "",
    projectTable: "",
    artifactsSection: "",
    context: "",
    contextFiles: [],
    commands: [],
    skills: [],
  };
}

describe("WorkspaceGenerator", () => {
  const gen = new WorkspaceGenerator();

  it("generates workspace file with hub and projects", () => {
    const files = gen.generate(makeConfig(), makeContext());
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("test-hub.code-workspace");
    const parsed = JSON.parse(files[0].content);
    expect(parsed.folders).toHaveLength(3);
    expect(parsed.folders[0].name).toBe("test-hub");
    expect(parsed.folders[0].path).toBe(".");
  });

  it("resolves ~ in project paths", () => {
    const files = gen.generate(makeConfig(), makeContext());
    const parsed = JSON.parse(files[0].content);
    const myappFolder = parsed.folders.find((f: { name: string }) => f.name === "myapp");
    expect(myappFolder.path).not.toContain("~");
  });
});
