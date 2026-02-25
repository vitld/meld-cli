import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { MeldConfig } from "../config/types.js";
import type { ComposedContext } from "../context/types.js";
import type { Generator, GeneratedFile } from "./types.js";

const START_MARKER = "# ── meld managed (do not edit) ──";
const END_MARKER = "# ── end meld managed ──";

export class GitignoreGenerator implements Generator {
  name = "gitignore";

  generate(_config: MeldConfig, context: ComposedContext): GeneratedFile[] {
    const lines: string[] = [
      "agents/",
      "scratch/",
    ];

    const managedBlock = [
      START_MARKER,
      ...lines,
      END_MARKER,
    ].join("\n");

    const content = spliceIntoExisting(context.hubDir, managedBlock);

    return [{ path: ".gitignore", content }];
  }
}

function spliceIntoExisting(hubDir: string, managedBlock: string): string {
  const gitignorePath = join(hubDir, ".gitignore");

  if (!existsSync(gitignorePath)) {
    return managedBlock + "\n";
  }

  const existing = readFileSync(gitignorePath, "utf-8");
  const startIdx = existing.indexOf(START_MARKER);
  const endIdx = existing.indexOf(END_MARKER);

  if (startIdx === -1 || endIdx === -1) {
    const trimmed = existing.trimEnd();
    return trimmed + (trimmed.length > 0 ? "\n\n" : "") + managedBlock + "\n";
  }

  const before = existing.slice(0, startIdx);
  const after = existing.slice(endIdx + END_MARKER.length);

  return before + managedBlock + after;
}
