export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deepMerge(
  base: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(overrides)) {
    const current = merged[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      merged[key] = deepMerge(current, value);
      continue;
    }
    merged[key] = value;
  }

  return merged;
}

export function serializeToml(config: Record<string, unknown>): string {
  const lines: string[] = [];
  appendTable([], config, lines);
  return `${lines.join("\n")}\n`;
}

function appendTable(path: string[], table: Record<string, unknown>, lines: string[]): void {
  const entries = Object.entries(table).filter(([, value]) => value !== undefined && value !== null);
  const scalarEntries = entries.filter(([, value]) => !isPlainObject(value));
  const tableEntries = entries.filter(([, value]) => isPlainObject(value)) as [string, Record<string, unknown>][];

  if (path.length > 0 && scalarEntries.length === 0 && tableEntries.length === 0) {
    return;
  }

  if (path.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push(`[${path.map(escapeTomlKey).join(".")}]`);
  }

  for (const [key, value] of scalarEntries) {
    lines.push(`${escapeTomlKey(key)} = ${formatTomlValue(value)}`);
  }

  for (const [key, value] of tableEntries) {
    appendTable([...path, key], value, lines);
  }
}

function formatTomlValue(value: unknown): string {
  if (typeof value === "string") return `"${escapeTomlString(value)}"`;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot serialize non-finite number to TOML: ${value}`);
    }
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    return `[${value.map((item) => formatTomlArrayValue(item)).join(", ")}]`;
  }

  throw new Error(`Unsupported TOML value type: ${typeof value}`);
}

function formatTomlArrayValue(value: unknown): string {
  if (typeof value === "string") return `"${escapeTomlString(value)}"`;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot serialize non-finite number to TOML: ${value}`);
    }
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";

  throw new Error(`Unsupported TOML array value type: ${typeof value}`);
}

function escapeTomlKey(key: string): string {
  return /^[A-Za-z0-9_-]+$/.test(key)
    ? key
    : `"${escapeTomlString(key)}"`;
}

function escapeTomlString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}
