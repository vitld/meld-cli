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
  skills: SkillMeta[];
}

export interface ProjectIndexEntry {
  name: string;
  aliases: string[];
  path: string;
  repo?: string;
}

export interface SkillMeta {
  name: string;
  frontmatter: Record<string, unknown>;
  body: string;
  source: "local" | "external";
  sourceDir: string;
}
