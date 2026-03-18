import { describe, it, expect } from "vitest";
import { writeGeneratedFiles, writeGeneratedSkillDirs } from "../writer.js";
import { readFileSync, writeFileSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { GeneratedFile, GeneratedSkillDir } from "../types.js";

function createTempDir(): string {
  const dir = join(tmpdir(), `meld-writer-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("writeGeneratedFiles", () => {
  it("writes files to the correct paths", () => {
    const dir = createTempDir();
    const files: GeneratedFile[] = [
      { path: "CLAUDE.md", content: "# Claude\nHello" },
      { path: ".mcp.json", content: "{}" },
    ];
    try {
      const written = writeGeneratedFiles(dir, files);
      expect(written).toHaveLength(2);
      expect(readFileSync(join(dir, "CLAUDE.md"), "utf-8")).toBe("# Claude\nHello");
      expect(readFileSync(join(dir, ".mcp.json"), "utf-8")).toBe("{}");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("creates intermediate directories", () => {
    const dir = createTempDir();
    const files: GeneratedFile[] = [
      { path: ".claude/commands/meld/gsd.md", content: "gsd command" },
    ];
    try {
      writeGeneratedFiles(dir, files);
      expect(readFileSync(join(dir, ".claude/commands/meld/gsd.md"), "utf-8")).toBe(
        "gsd command",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns dry-run results without writing when dryRun is true", () => {
    const dir = createTempDir();
    const files: GeneratedFile[] = [
      { path: "CLAUDE.md", content: "# Claude" },
    ];
    try {
      const written = writeGeneratedFiles(dir, files, { dryRun: true });
      expect(written).toHaveLength(1);
      expect(existsSync(join(dir, "CLAUDE.md"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("writeGeneratedSkillDirs", () => {
  it("writes skill directories with transformed SKILL.md", () => {
    const sourceDir = createTempDir();
    const outputDir = createTempDir();

    writeFileSync(join(sourceDir, "SKILL.md"), "original frontmatter");
    mkdirSync(join(sourceDir, "rules"), { recursive: true });
    writeFileSync(join(sourceDir, "rules", "styling.md"), "styling rules");
    writeFileSync(join(sourceDir, "cli.md"), "cli docs");

    const skillDirs: GeneratedSkillDir[] = [{
      sourceDir,
      outputDir: "agents/claude-code/.claude/skills/shadcn",
      transformedSkillMd: "transformed frontmatter",
    }];

    try {
      writeGeneratedSkillDirs(outputDir, skillDirs);
      expect(readFileSync(join(outputDir, "agents/claude-code/.claude/skills/shadcn/SKILL.md"), "utf-8")).toBe("transformed frontmatter");
      expect(readFileSync(join(outputDir, "agents/claude-code/.claude/skills/shadcn/rules/styling.md"), "utf-8")).toBe("styling rules");
      expect(readFileSync(join(outputDir, "agents/claude-code/.claude/skills/shadcn/cli.md"), "utf-8")).toBe("cli docs");
    } finally {
      rmSync(sourceDir, { recursive: true, force: true });
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it("skips skill dir writes in dry-run", () => {
    const sourceDir = createTempDir();
    const outputDir = createTempDir();

    writeFileSync(join(sourceDir, "SKILL.md"), "original");

    const skillDirs: GeneratedSkillDir[] = [{
      sourceDir,
      outputDir: "agents/claude-code/.claude/skills/test-skill",
      transformedSkillMd: "transformed",
    }];

    try {
      writeGeneratedSkillDirs(outputDir, skillDirs, { dryRun: true });
      expect(existsSync(join(outputDir, "agents/claude-code/.claude/skills/test-skill/SKILL.md"))).toBe(false);
    } finally {
      rmSync(sourceDir, { recursive: true, force: true });
      rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
