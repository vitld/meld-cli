import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import type { GeneratedFile } from "./types.js";

export interface WriteOptions {
  dryRun?: boolean;
}

export function writeGeneratedFiles(
  hubDir: string,
  files: GeneratedFile[],
  options: WriteOptions = {},
): GeneratedFile[] {
  if (!options.dryRun) {
    for (const file of files) {
      const fullPath = join(hubDir, file.path);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, file.content);
    }
  }
  return files;
}
