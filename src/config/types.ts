export interface MeldConfig {
  projects: Record<string, ProjectConfig>;
  agents: Record<AgentName, AgentConfig>;
  mcp: Record<string, McpServerConfig>;
  context?: string;
  ide: IdeConfig;
}

export type AgentName = "claude-code" | "codex-cli" | "gemini-cli";

export interface ProjectConfig {
  path: string;
  aliases: string[];
  repo?: string;
}

export interface AgentConfig {
  enabled: boolean;
  dir?: string;
  overrides?: Record<string, unknown>;
}

export const AGENTS_DIR = "agents";

export const DEFAULT_AGENT_DIRS: Record<AgentName, string> = {
  "claude-code": "claude-code",
  "codex-cli": "codex",
  "gemini-cli": "gemini",
};

export function resolveAgentDir(name: AgentName, agentConfig: AgentConfig): string {
  return agentConfig.dir ?? DEFAULT_AGENT_DIRS[name];
}

export type McpServerConfig = McpStdioServerConfig | McpHttpServerConfig;

export interface McpStdioServerConfig {
  type?: "stdio";
  command: string;
  args: string[];
  env?: Record<string, string>;
  agents?: AgentName[];
}

export interface McpHttpServerConfig {
  type: "http";
  url: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
  agents?: AgentName[];
}

export function isHttpMcp(server: McpServerConfig): server is McpHttpServerConfig {
  return server.type === "http";
}

export interface IdeConfig {
  default: string;
  workspaceName: string;
}

export const DEFAULT_CONTEXT_PATH = "./context/";

export function resolveContextPath(contextPath?: string): string {
  return contextPath ?? DEFAULT_CONTEXT_PATH;
}
