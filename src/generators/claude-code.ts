import type { MeldConfig } from "../config/types.js";
import { isHttpMcp } from "../config/types.js";
import type { ComposedContext, SkillMeta } from "../context/types.js";
import type { Generator, GeneratedFile } from "./types.js";
import { deepMerge, isPlainObject } from "./utils.js";

export class ClaudeCodeGenerator implements Generator {
  name = "claude-code";

  generate(config: MeldConfig, context: ComposedContext): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    files.push({
      path: "CLAUDE.md",
      content: this.buildInstructions(context),
    });

    files.push({
      path: ".mcp.json",
      content: this.buildMcpConfig(config),
    });

    files.push({
      path: ".claude/settings.json",
      content: this.buildSettings(config, context.hubDir),
    });

    for (const command of context.commands) {
      files.push({
        path: `.claude/commands/meld/${command.name}.md`,
        content: command.content,
      });
    }

    for (const skill of context.skills) {
      files.push({
        path: `.claude/skills/meld-${skill.name}/SKILL.md`,
        content: this.buildSkill(skill),
      });
    }

    for (const file of context.contextFiles) {
      files.push({ path: file.path, content: file.content });
    }

    return files;
  }

  private buildInstructions(context: ComposedContext): string {
    const sections: string[] = [context.hubPreamble];

    if (context.projectTable) {
      sections.push(context.projectTable);
    }

    sections.push(context.artifactsSection);

    if (context.context) {
      sections.push(context.context);
    }

    return sections.join("\n\n");
  }

  private buildMcpConfig(config: MeldConfig): string {
    const servers: Record<string, Record<string, unknown>> = {};

    for (const [name, server] of Object.entries(config.mcp)) {
      if (server.agents && !server.agents.includes("claude-code")) continue;

      if (isHttpMcp(server)) {
        const entry: Record<string, unknown> = { type: "http", url: server.url };
        if (server.headers) entry.headers = server.headers;
        if (server.env) entry.env = server.env;
        servers[name] = entry;
      } else {
        const entry: Record<string, unknown> = { command: server.command, args: server.args };
        if (server.env) entry.env = server.env;
        servers[name] = entry;
      }
    }

    return JSON.stringify({ mcpServers: servers }, null, 2);
  }

  private buildSettings(config: MeldConfig, hubDir: string): string {
    const settings: Record<string, unknown> = {};

    // Enable lazy MCP tool loading
    settings.env = { ENABLE_TOOL_SEARCH: "true" };

    // Permissions
    const allow: string[] = [];

    // Non-destructive tools (not path-scoped)
    const safeTools = ["Task", "WebSearch", "WebFetch", "ToolSearch"];
    allow.push(...safeTools);

    // Non-destructive Bash commands (not path-scoped since flags break prefix matching)
    const safeBashCommands = [
      "cd", "ls", "mkdir", "cp", "mv", "cat",
      "git", "gh",
      "node", "npx", "npm", "yarn", "pnpm", "bun",
      "which", "pwd", "ast-grep",
    ];
    for (const cmd of safeBashCommands) {
      allow.push(`Bash(command:${cmd} *)`);
    }

    // Hub root permissions
    allow.push(`Read(//${hubDir}/**)`);
    allow.push(`Glob(//${hubDir}/**)`);
    allow.push(`Grep(//${hubDir}/**)`);
    allow.push(`Write(//${hubDir}/**)`);
    allow.push(`Edit(//${hubDir}/**)`);

    // Per-project permissions
    const additionalDirectories: string[] = [];
    for (const [, project] of Object.entries(config.projects)) {
      allow.push(`Read(//${project.path}/**)`);
      allow.push(`Glob(//${project.path}/**)`);
      allow.push(`Grep(//${project.path}/**)`);
      allow.push(`Write(//${project.path}/**)`);
      allow.push(`Edit(//${project.path}/**)`);
      additionalDirectories.push(project.path);
    }
    settings.permissions = { allow, additionalDirectories };

    const overrides = config.agents["claude-code"].overrides;
    const mergedSettings = isPlainObject(overrides)
      ? deepMerge(settings, overrides)
      : settings;

    return JSON.stringify(mergedSettings, null, 2);
  }

  private buildSkill(skill: SkillMeta): string {
    const fm = { ...skill.frontmatter };

    // Resolve model for claude
    if (fm.model && typeof fm.model === "object" && !Array.isArray(fm.model)) {
      const modelMap = fm.model as Record<string, string>;
      if (modelMap["claude-code"]) {
        fm.model = modelMap["claude-code"];
      } else {
        delete fm.model;
      }
    }

    const frontmatterLines = this.serializeFrontmatter(fm);
    return `---\n${frontmatterLines}\n---\n\n${skill.body}`;
  }

  private serializeFrontmatter(fm: Record<string, unknown>): string {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(fm)) {
      if (typeof value === "string") {
        lines.push(`${key}: ${value}`);
      } else if (typeof value === "boolean") {
        lines.push(`${key}: ${value}`);
      } else if (Array.isArray(value)) {
        lines.push(`${key}: [${value.join(", ")}]`);
      }
    }
    return lines.join("\n");
  }
}
