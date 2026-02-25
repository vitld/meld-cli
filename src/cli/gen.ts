import { Command } from "commander";
import { generate } from "../generate.js";
import type { AgentName } from "../config/types.js";

export const genCommand = new Command("gen")
  .description("Generate all agent configs from meld.jsonc")
  .option("--dry-run", "Preview changes without writing files")
  .option("--agent <name>", "Generate for a single agent (claude-code, codex-cli, gemini-cli)")
  .action((options) => {
    const hubDir = process.cwd();

    const result = generate(hubDir, {
      dryRun: options.dryRun,
      agent: options.agent as AgentName | undefined,
    });

    if (!result.ok) {
      console.error("Generation failed:");
      for (const error of result.errors) {
        console.error(`  - ${error}`);
      }
      process.exit(1);
    }

    if (result.warnings.length > 0) {
      for (const w of result.warnings) {
        console.warn(`  warning: ${w}`);
      }
      console.warn();
    }

    if (options.dryRun) {
      console.log("Dry run — would generate:");
    } else {
      console.log("Generated:");
    }

    for (const file of result.files) {
      console.log(`  ${file.path}`);
    }

    console.log(`\n${result.files.length} file(s) ${options.dryRun ? "would be" : ""} generated.`);
  });
