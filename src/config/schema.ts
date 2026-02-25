import type { MeldConfig, AgentName } from "./types.js";

const VALID_AGENTS: AgentName[] = ["claude-code", "codex-cli", "gemini-cli"];

type ValidationResult =
  | { ok: true; config: MeldConfig }
  | { ok: false; errors: string[] };

export function validateConfig(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: ["Config must be an object"] };
  }

  const obj = input as Record<string, unknown>;

  const requiredKeys = ["projects", "agents", "mcp", "ide"];
  for (const key of requiredKeys) {
    if (!(key in obj)) {
      errors.push(`Missing required key: ${key}`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Validate agents
  const agents = obj.agents as Record<string, unknown>;
  for (const name of Object.keys(agents)) {
    if (!VALID_AGENTS.includes(name as AgentName)) {
      errors.push(`Invalid agent name: ${name}. Must be one of: ${VALID_AGENTS.join(", ")}`);
    }

    const agent = agents[name] as Record<string, unknown>;
    if (
      "overrides" in agent
      && agent.overrides != null
      && (typeof agent.overrides !== "object" || Array.isArray(agent.overrides))
    ) {
      errors.push(`Agent "${name}" overrides must be an object`);
    }
  }

  // Validate MCP servers
  const mcp = obj.mcp as Record<string, unknown>;
  for (const [serverName, server] of Object.entries(mcp)) {
    const s = server as Record<string, unknown>;
    if (s.type === "http") {
      if (typeof s.url !== "string" || !s.url) {
        errors.push(`MCP server "${serverName}" (http) must have a "url" string`);
      }
    } else {
      if (typeof s.command !== "string" || !s.command) {
        errors.push(`MCP server "${serverName}" (stdio) must have a "command" string`);
      }
      if (!Array.isArray(s.args)) {
        errors.push(`MCP server "${serverName}" (stdio) must have an "args" array`);
      }
    }
    if (s.agents && Array.isArray(s.agents)) {
      for (const agent of s.agents) {
        if (!VALID_AGENTS.includes(agent as AgentName)) {
          errors.push(`MCP server "${serverName}" has invalid agent scope: ${agent}`);
        }
      }
    }
  }

  // Validate context if present
  if ("context" in obj && obj.context != null) {
    if (typeof obj.context !== "string") {
      errors.push("context must be a string path");
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, config: input as MeldConfig };
}
