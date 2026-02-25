import type { MeldConfig } from "../config/types.js";
import { isHttpMcp } from "../config/types.js";
import type { ComposedContext, SkillMeta } from "../context/types.js";
import type { Generator, GeneratedFile } from "./types.js";
import { deepMerge, isPlainObject } from "./utils.js";

export class GeminiCliGenerator implements Generator {
  name = "gemini-cli";

  generate(config: MeldConfig, context: ComposedContext): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    files.push({
      path: "GEMINI.md",
      content: this.buildInstructions(context),
    });

    files.push({
      path: ".gemini/settings.json",
      content: this.buildSettings(config),
    });

    for (const command of context.commands) {
      files.push({
        path: `.gemini/commands/meld/${command.name}.toml`,
        content: this.buildCommandToml(command.name, command.content),
      });
    }

    for (const skill of context.skills) {
      files.push({
        path: `.gemini/commands/meld/${skill.name}.toml`,
        content: this.buildSkillToml(skill),
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

  private buildSettings(config: MeldConfig): string {
    const servers: Record<string, Record<string, unknown>> = {};

    for (const [name, server] of Object.entries(config.mcp)) {
      if (server.agents && !server.agents.includes("gemini-cli")) continue;

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

    const settings: Record<string, unknown> = { mcpServers: servers };
    const overrides = config.agents["gemini-cli"].overrides;
    const mergedSettings = isPlainObject(overrides)
      ? deepMerge(settings, overrides)
      : settings;

    return JSON.stringify(mergedSettings, null, 2);
  }

  private buildCommandToml(name: string, content: string): string {
    return [
      `description = "${name}"`,
      "",
      `[template]`,
      `prompt = """`,
      content,
      `"""`,
    ].join("\n");
  }

  private buildSkillToml(skill: SkillMeta): string {
    const description = (skill.frontmatter.description as string) ?? skill.name;
    return [
      `# skill: ${skill.name}`,
      `description = "${description}"`,
      "",
      `[template]`,
      `prompt = """`,
      skill.body,
      `"""`,
    ].join("\n");
  }
}
