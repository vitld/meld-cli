import type { MeldConfig } from "../config/types.js";
import { isHttpMcp } from "../config/types.js";
import type { ComposedContext, SkillMeta } from "../context/types.js";
import type { Generator, GenerateOutput, GeneratedFile, GeneratedSkillDir } from "./types.js";
import { deepMerge, isPlainObject } from "./utils.js";

export class GeminiCliGenerator implements Generator {
  name = "gemini-cli";

  generate(config: MeldConfig, context: ComposedContext): GenerateOutput {
    const files: GeneratedFile[] = [];

    files.push({
      path: "GEMINI.md",
      content: this.buildInstructions(context),
    });

    files.push({
      path: ".gemini/settings.json",
      content: this.buildSettings(config),
    });

    for (const file of context.contextFiles) {
      files.push({ path: file.path, content: file.content });
    }

    const skillDirs: GeneratedSkillDir[] = context.skills.map((skill) => ({
      sourceDir: skill.sourceDir,
      outputDir: `.agents/skills/${skill.source === "local" ? "meld-" : ""}${skill.name}`,
      transformedSkillMd: this.buildSkill(skill),
    }));

    return { files, skillDirs };
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

  private buildSkill(skill: SkillMeta): string {
    const fm = { ...skill.frontmatter };

    if (fm.model && typeof fm.model === "object" && !Array.isArray(fm.model)) {
      const modelMap = fm.model as Record<string, string>;
      if (modelMap["gemini-cli"]) {
        fm.model = modelMap["gemini-cli"];
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
