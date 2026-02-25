import { Command } from "commander";
import * as p from "@clack/prompts";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../config/loader.js";
import { generate } from "../generate.js";
import { readPackageSchema } from "../hub-schema.js";
import { generateReadme } from "../readme.js";

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

/**
 * Injects $schema as the first property in meld.jsonc if missing.
 * Works at the text level to preserve comments and formatting.
 */
function ensureSchema(hubDir: string): void {
  const configPath = join(hubDir, "meld.jsonc");
  const raw = readFileSync(configPath, "utf-8");

  if (raw.includes('"$schema"')) return;

  const patched = raw.replace(/^\s*\{/, '{\n  "$schema": "./meld.schema.json",');
  writeFileSync(configPath, patched);
}

export const updateCommand = new Command("update")
  .description("Re-scaffold hub structure and update defaults without touching config")
  .action(() => {
    const hubDir = process.cwd();

    // 1. Load config — fail early if no meld.jsonc
    const loadResult = loadConfig(hubDir);
    if (!loadResult.ok) {
      p.log.error(
        `Cannot update: ${loadResult.errors.join(", ")}\nRun \`meld init\` first.`,
      );
      process.exit(1);
    }

    const config = loadResult.config;

    // 2. Ensure standard dirs
    const standardDirs = [
      "context",
      "commands",
      "skills",
      join("artifacts", "hub"),
      "scratch",
    ];
    for (const dir of standardDirs) {
      ensureDir(join(hubDir, dir));
    }

    // 3. Ensure project artifact dirs
    for (const name of Object.keys(config.projects)) {
      ensureDir(join(hubDir, "artifacts", "projects", name));
    }

    // 4. Ensure $schema reference in meld.jsonc
    ensureSchema(hubDir);

    // 5. Refresh schema and README
    writeFileSync(join(hubDir, "meld.schema.json"), readPackageSchema());
    writeFileSync(join(hubDir, "README.md"), generateReadme(config));

    // 6. Regenerate agent configs
    const result = generate(hubDir);
    if (!result.ok) {
      p.log.error(`Generation failed: ${result.errors.join(", ")}`);
      process.exit(1);
    }

    // 7. Report
    p.log.success("Updated hub structure and defaults.");
    if (result.files.length > 0) {
      p.log.info("Generated files:");
      for (const file of result.files) {
        p.log.message(`  ${file.path}`);
      }
    }
    p.log.info("Review changes, then commit when ready.");
  });
