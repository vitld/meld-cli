import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseJsonc } from "jsonc-parser";

/**
 * Reads, modifies, and writes back meld.jsonc.
 * Note: comments are lost on round-trip since we write JSON.
 * Acceptable for v1 — preserving comments requires jsonc-parser's edit API.
 */
export function updateConfig(
  hubDir: string,
  updater: (config: Record<string, unknown>) => void,
): void {
  const configPath = join(hubDir, "meld.jsonc");
  const raw = readFileSync(configPath, "utf-8");
  const config = parseJsonc(raw) as Record<string, unknown>;
  updater(config);
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}
