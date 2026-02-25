import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig } from "../loader.js";

describe("loadConfig", () => {
  let hubDir: string;

  beforeEach(() => {
    hubDir = mkdtempSync(join(tmpdir(), "meld-test-"));
  });

  afterEach(() => {
    rmSync(hubDir, { recursive: true, force: true });
  });

  const validConfig = {
    projects: {},
    agents: { "claude-code": { enabled: true }, "codex-cli": { enabled: false }, "gemini-cli": { enabled: false } },
    mcp: {},
    ide: { default: "cursor", workspaceName: "test" },
  };

  it("loads valid JSONC config", () => {
    writeFileSync(join(hubDir, "meld.jsonc"), `// comment\n${JSON.stringify(validConfig, null, 2)}`);
    const result = loadConfig(hubDir);
    expect(result.ok).toBe(true);
  });

  it("returns error when file is missing", () => {
    const result = loadConfig(hubDir);
    expect(result.ok).toBe(false);
  });

  it("returns error for invalid JSON", () => {
    writeFileSync(join(hubDir, "meld.jsonc"), "not json{{{");
    const result = loadConfig(hubDir);
    expect(result.ok).toBe(false);
  });
});
