import type { MeldConfig } from "../config/types.js";
import type { ComposedContext } from "../context/types.js";

export interface GenerateOutput {
  files: GeneratedFile[];
  skillDirs: GeneratedSkillDir[];
}

export interface Generator {
  name: string;
  generate(config: MeldConfig, context: ComposedContext): GenerateOutput;
}

export interface GeneratedFile {
  /** Relative path from hub root */
  path: string;
  content: string;
}

export interface GeneratedSkillDir {
  sourceDir: string;
  outputDir: string;
  transformedSkillMd: string;
}
