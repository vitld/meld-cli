import type { MeldConfig } from "../config/types.js";
import type { ComposedContext } from "../context/types.js";

export interface Generator {
  name: string;
  generate(config: MeldConfig, context: ComposedContext): GeneratedFile[];
}

export interface GeneratedFile {
  /** Relative path from hub root */
  path: string;
  content: string;
}
