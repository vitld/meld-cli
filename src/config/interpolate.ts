import type { MeldConfig } from "./types.js";

export interface InterpolateResult {
  config: MeldConfig;
  warnings: string[];
}

const ENV_PATTERN = /\$\{([A-Za-z_][A-Za-z0-9_]*)}/g;

export function interpolateEnv(config: MeldConfig): InterpolateResult {
  const warnings: string[] = [];
  const resolved = deepInterpolate(config, warnings) as MeldConfig;
  return { config: resolved, warnings };
}

function deepInterpolate(value: unknown, warnings: string[]): unknown {
  if (typeof value === "string") {
    return value.replace(ENV_PATTERN, (match, varName: string) => {
      const envValue = process.env[varName];
      if (envValue === undefined) {
        warnings.push(`Environment variable not set: ${varName}`);
        return match;
      }
      return envValue;
    });
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepInterpolate(item, warnings));
  }
  if (typeof value === "object" && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = deepInterpolate(val, warnings);
    }
    return result;
  }
  return value;
}
