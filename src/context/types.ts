export interface ContextFile {
  path: string;
  content: string;
}

export interface ComposedContext {
  hubDir: string;
  hubPreamble: string;
  projectTable: string;
  artifactsSection: string;
  context: string;
  contextFiles: ContextFile[];
  commands: CommandMeta[];
  skills: SkillMeta[];
}

export interface ProjectIndexEntry {
  name: string;
  aliases: string[];
  path: string;
  repo?: string;
}

export interface CommandMeta {
  name: string;
  content: string;
}

export interface SkillMeta {
  name: string;
  frontmatter: Record<string, unknown>;
  body: string;
}
