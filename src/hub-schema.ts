import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Reads meld.schema.json from the package root.
 * Works both in bundled dist/ and source src/ contexts.
 */
export function readPackageSchema(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (dir !== dirname(dir)) {
    const schemaPath = join(dir, "meld.schema.json");
    if (existsSync(schemaPath)) {
      return readFileSync(schemaPath, "utf-8");
    }
    dir = dirname(dir);
  }
  throw new Error("Could not locate meld.schema.json");
}
