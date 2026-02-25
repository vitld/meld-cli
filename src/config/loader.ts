import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseJsonc, type ParseError } from "jsonc-parser";
import { validateConfig } from "./schema.js";
import type { MeldConfig } from "./types.js";

type LoadResult =
  | { ok: true; config: MeldConfig }
  | { ok: false; errors: string[] };

export function loadConfig(hubDir: string): LoadResult {
  const configPath = join(hubDir, "meld.jsonc");

  if (!existsSync(configPath)) {
    return { ok: false, errors: [`Config file not found: ${configPath}`] };
  }

  let raw: string;
  try {
    raw = readFileSync(configPath, "utf-8");
  } catch (err) {
    return {
      ok: false,
      errors: [`Failed to read config: ${(err as Error).message}`],
    };
  }

  let parsed: unknown;
  const parseErrors: ParseError[] = [];
  parsed = parseJsonc(raw, parseErrors);

  if (parseErrors.length > 0) {
    return {
      ok: false,
      errors: [`Invalid JSONC in meld.jsonc: ${parseErrors.length} parse error(s)`],
    };
  }

  return validateConfig(parsed);
}
