import type { MeldConfig } from "../config/types.js";
import { isHttpMcp } from "../config/types.js";
import type { ComposedContext, SkillMeta } from "../context/types.js";
import type { Generator, GeneratedFile } from "./types.js";
import { deepMerge, isPlainObject, serializeToml } from "./utils.js";

export class CodexCliGenerator implements Generator {
  name = "codex-cli";

  generate(config: MeldConfig, context: ComposedContext): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    files.push({
      path: "AGENTS.md",
      content: this.buildInstructions(context),
    });

    files.push({
      path: ".codex/config.toml",
      content: this.buildConfigToml(config, context),
    });

    for (const command of context.commands) {
      files.push({
        path: `.agents/skills/meld-cmd-${command.name}/SKILL.md`,
        content: command.content,
      });
    }

    for (const skill of context.skills) {
      files.push({
        path: `.agents/skills/meld-${skill.name}/SKILL.md`,
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

  private buildConfigToml(config: MeldConfig, context: ComposedContext): string {
    const writableRoots = Array.from(new Set([
      context.hubDir,
      ...Object.values(config.projects).map((project) => project.path),
    ]));

    const generatedConfig: Record<string, unknown> = {
      approval_policy: "on-request",
      sandbox_mode: "workspace-write",
      sandbox_workspace_write: {
        writable_roots: writableRoots,
      },
    };

    const mcpServers = this.buildMcpServers(config);
    if (Object.keys(mcpServers).length > 0) {
      generatedConfig.mcp_servers = mcpServers;
    }

    const overrides = config.agents["codex-cli"].overrides;
    const mergedConfig = isPlainObject(overrides)
      ? deepMerge(generatedConfig, overrides)
      : generatedConfig;

    return serializeToml(mergedConfig);
  }

  private buildMcpServers(config: MeldConfig): Record<string, Record<string, unknown>> {
    const servers: Record<string, Record<string, unknown>> = {};

    for (const [name, server] of Object.entries(config.mcp)) {
      if (server.agents && !server.agents.includes("codex-cli")) continue;

      if (isHttpMcp(server)) {
        const entry: Record<string, unknown> = { url: server.url };
        if (server.headers && Object.keys(server.headers).length > 0) {
          entry.http_headers = server.headers;
        }
        if (server.env && Object.keys(server.env).length > 0) {
          entry.env = server.env;
        }
        servers[name] = entry;
      } else {
        const entry: Record<string, unknown> = { command: server.command, args: server.args };
        if (server.env && Object.keys(server.env).length > 0) {
          entry.env = server.env;
        }
        servers[name] = entry;
      }
    }

    return servers;
  }

  private buildSkill(skill: SkillMeta): string {
    const fm = { ...skill.frontmatter };

    if (fm.model && typeof fm.model === "object" && !Array.isArray(fm.model)) {
      const modelMap = fm.model as Record<string, string>;
      if (modelMap["codex-cli"]) {
        fm.model = modelMap["codex-cli"];
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
