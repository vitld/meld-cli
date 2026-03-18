import { writeFileSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import type { GeneratedFile, GeneratedSkillDir } from "./types.js";

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

export function writeGeneratedSkillDirs(
  hubDir: string,
  skillDirs: GeneratedSkillDir[],
  options: WriteOptions = {},
): void {
  if (options.dryRun) return;

  for (const skill of skillDirs) {
    const destDir = join(hubDir, skill.outputDir);
    copyDirRecursive(skill.sourceDir, destDir);
    writeFileSync(join(destDir, "SKILL.md"), skill.transformedSkillMd);
  }
}

function copyDirRecursive(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}
