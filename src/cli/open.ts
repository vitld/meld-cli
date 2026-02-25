import { Command } from "commander";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../config/loader.js";

const IDE_COMMANDS: Record<string, string> = {
  cursor: "cursor",
  code: "code",
  windsurf: "windsurf",
};

export const openCommand = new Command("open")
  .description("Open the hub workspace in your IDE")
  .option("--ide <name>", "IDE to use (cursor, code, windsurf)")
  .action((options) => {
    const hubDir = process.cwd();
    const result = loadConfig(hubDir);
    if (!result.ok) {
      console.error("Failed to load config:", result.errors.join(", "));
      process.exit(1);
    }

    const ide = options.ide ?? result.config.ide.default;
    const command = IDE_COMMANDS[ide];
    if (!command) {
      console.error(`Unknown IDE: ${ide}. Supported: ${Object.keys(IDE_COMMANDS).join(", ")}`);
      process.exit(1);
    }

    const workspaceFile = join(
      hubDir,
      `${result.config.ide.workspaceName}.code-workspace`,
    );

    if (!existsSync(workspaceFile)) {
      console.error(`Workspace file not found: ${workspaceFile}\nRun: meld gen`);
      process.exit(1);
    }

    execSync(`${command} "${workspaceFile}"`, { stdio: "inherit" });
  });
