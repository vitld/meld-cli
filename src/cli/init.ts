import { Command } from "commander";
import * as p from "@clack/prompts";
import { writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import type { MeldConfig } from "../config/types.js";
import { readPackageSchema } from "../hub-schema.js";
import { generateReadme } from "../readme.js";

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

export const initCommand = new Command("init")
  .description("Initialize a new meld hub")
  .action(async () => {
    p.intro("meld — agent config generator");

    const hubDir = process.cwd();

    if (existsSync(join(hubDir, "meld.jsonc"))) {
      p.log.warn("meld.jsonc already exists in this directory.");
      const overwrite = await p.confirm({
        message: "Overwrite existing config?",
        initialValue: false,
      });
      if (p.isCancel(overwrite) || !overwrite) {
        p.cancel("Cancelled.");
        process.exit(0);
      }
    }

    // Non-empty directory safeguard
    const ignored = new Set([".git", "meld.jsonc"]);
    const existing = readdirSync(hubDir).filter((f) => !ignored.has(f));
    if (existing.length > 0) {
      p.log.warn(
        `Directory contains ${existing.length} existing file(s): ${existing.slice(0, 5).join(", ")}${existing.length > 5 ? ", ..." : ""}`,
      );
      const proceed = await p.confirm({
        message:
          "This directory contains existing files. Running init here will commit them all. Continue?",
        initialValue: false,
      });
      if (p.isCancel(proceed) || !proceed) {
        p.cancel("Cancelled.");
        process.exit(0);
      }
    }

    // Agent selection
    const agents = await p.multiselect({
      message: "Which agents do you want to generate configs for?",
      options: [
        { value: "claude-code", label: "Claude Code" },
        { value: "codex-cli", label: "Codex CLI" },
        { value: "gemini-cli", label: "Gemini CLI" },
      ],
      required: true,
    });

    if (p.isCancel(agents)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }

    // IDE selection
    const ide = await p.select({
      message: "Default IDE?",
      options: [
        { value: "cursor", label: "Cursor" },
        { value: "code", label: "VS Code" },
        { value: "windsurf", label: "Windsurf" },
      ],
    });

    if (p.isCancel(ide)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }

    // Workspace name
    const workspaceName = await p.text({
      message: "Workspace name",
      placeholder: "meld-hub",
      defaultValue: "meld-hub",
    });

    if (p.isCancel(workspaceName)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }

    // Build config
    const config: MeldConfig = {
      projects: {},
      agents: {
        "claude-code": { enabled: (agents as string[]).includes("claude-code") },
        "codex-cli": { enabled: (agents as string[]).includes("codex-cli") },
        "gemini-cli": { enabled: (agents as string[]).includes("gemini-cli") },
      },
      mcp: {},
      ide: {
        default: ide as string,
        workspaceName: workspaceName as string,
      },
    };

    // Write config with $schema reference
    const configWithSchema = { $schema: "./meld.schema.json", ...config };
    writeFileSync(join(hubDir, "meld.jsonc"), JSON.stringify(configWithSchema, null, 2));

    // Copy schema for IDE validation
    writeFileSync(join(hubDir, "meld.schema.json"), readPackageSchema());

    // Generate README
    writeFileSync(join(hubDir, "README.md"), generateReadme(config));

    // Create directories
    ensureDir(join(hubDir, "context"));
    ensureDir(join(hubDir, "commands"));
    ensureDir(join(hubDir, "skills"));
    ensureDir(join(hubDir, "artifacts", "hub"));
    ensureDir(join(hubDir, "scratch"));

    // .gitignore
    writeFileSync(join(hubDir, ".gitignore"), [
      "# ── meld managed (do not edit) ──",
      "agents/",
      "scratch/",
      "# ── end meld managed ──",
    ].join("\n") + "\n");

    // Git init + commit
    const hasGit = existsSync(join(hubDir, ".git"));
    if (!hasGit) {
      execSync("git init", { cwd: hubDir, stdio: "ignore" });
    }
    const meldFiles = [
      "meld.jsonc",
      "meld.schema.json",
      "README.md",
      ".gitignore",
    ];
    execSync(`git add ${meldFiles.join(" ")}`, { cwd: hubDir, stdio: "ignore" });
    execSync('git commit -m "init meld hub"', { cwd: hubDir, stdio: "ignore" });

    p.outro(
      [
        "Done! Created:",
        `  meld.jsonc          — central config (with schema for IDE autocomplete)`,
        `  meld.schema.json    — JSON schema for validation`,
        `  README.md           — getting started guide`,
        `  context/            — agent instructions`,
        `  commands/            — slash commands`,
        `  skills/              — reusable skills`,
        `  artifacts/hub/       — research & notes`,
        `  scratch/             — temporary work`,
        "",
        "Next: add projects with `meld project add`, edit context/, then run `meld gen`",
      ].join("\n"),
    );
  });
