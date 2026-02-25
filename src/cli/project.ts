import { Command } from "commander";
import * as p from "@clack/prompts";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { updateConfig } from "../config/writer.js";
import { loadConfig } from "../config/loader.js";
import { generate } from "../generate.js";
import type { ProjectConfig } from "../config/types.js";

export const projectCommand = new Command("project")
  .description("Manage projects");

projectCommand
  .command("add")
  .description("Add a project interactively")
  .action(async () => {
    const hubDir = process.cwd();

    const name = await p.text({
      message: "Project name (used as config key)",
      placeholder: "my-project",
    });
    if (p.isCancel(name)) return;

    const path = await p.text({
      message: "Path to project",
      placeholder: "~/projects/my-project",
    });
    if (p.isCancel(path)) return;

    const aliasesRaw = await p.text({
      message: "Aliases (comma-separated, how you refer to it)",
      placeholder: "my proj, the project",
      defaultValue: "",
    });
    if (p.isCancel(aliasesRaw)) return;

    const aliases = (aliasesRaw as string)
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    const repo = await p.text({
      message: "GitHub repo (org/repo, optional)",
      placeholder: "org/repo",
      defaultValue: "",
    });
    if (p.isCancel(repo)) return;

    updateConfig(hubDir, (config) => {
      const projects = (config.projects ?? {}) as Record<string, ProjectConfig>;
      const entry: ProjectConfig = {
        path: path as string,
        aliases,
      };
      if (repo) entry.repo = repo as string;
      projects[name as string] = entry;
      config.projects = projects;
    });

    // Create artifacts directory for the project
    mkdirSync(join(hubDir, "artifacts", "projects", name as string), { recursive: true });

    generate(hubDir);
    console.log(`Added project "${name}" and regenerated configs.`);
  });

projectCommand
  .command("list")
  .description("List registered projects")
  .action(() => {
    const hubDir = process.cwd();
    const result = loadConfig(hubDir);
    if (!result.ok) {
      console.error("Failed to load config:", result.errors.join(", "));
      process.exit(1);
    }

    const projects = Object.entries(result.config.projects);
    if (projects.length === 0) {
      console.log("No projects registered. Run: meld project add");
      return;
    }

    console.log("Projects:\n");
    for (const [name, project] of projects) {
      console.log(`  ${name}`);
      console.log(`    Path: ${project.path}`);
      if (project.aliases.length > 0) {
        console.log(`    Aliases: ${project.aliases.join(", ")}`);
      }
      if (project.repo) {
        console.log(`    Repo: ${project.repo}`);
      }
      console.log("");
    }
  });

projectCommand
  .command("remove <name>")
  .description("Remove a project")
  .action((name: string) => {
    const hubDir = process.cwd();

    updateConfig(hubDir, (config) => {
      const projects = config.projects as Record<string, unknown>;
      if (!(name in projects)) {
        console.error(`Project "${name}" not found.`);
        process.exit(1);
      }
      delete projects[name];
    });

    generate(hubDir);
    console.log(`Removed project "${name}" and regenerated configs.`);
  });
