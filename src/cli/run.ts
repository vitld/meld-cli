import { Command } from "commander";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../config/loader.js";
import { resolveAgentDir, AGENTS_DIR } from "../config/types.js";
import type { AgentName } from "../config/types.js";

const AGENT_COMMANDS: Record<AgentName, string> = {
  "claude-code": "claude",
  "codex-cli": "codex",
  "gemini-cli": "gemini",
};

function runAgent(agentName: AgentName, args: string[]): void {
  const hubDir = process.cwd();
  const result = loadConfig(hubDir);
  if (!result.ok) {
    console.error("Failed to load config:", result.errors.join(", "));
    process.exit(1);
  }

  const agentConfig = result.config.agents[agentName];
  if (!agentConfig?.enabled) {
    console.error(`Agent "${agentName}" is not enabled in meld.jsonc`);
    process.exit(1);
  }

  const agentDir = join(hubDir, AGENTS_DIR, resolveAgentDir(agentName, agentConfig));
  if (!existsSync(agentDir)) {
    console.error(`Agent directory not found: ${agentDir}\nRun: meld gen`);
    process.exit(1);
  }

  const command = AGENT_COMMANDS[agentName];
  const { status, signal } = spawnSync(command, args, { cwd: agentDir, stdio: "inherit" });

  if (signal) {
    process.kill(process.pid, signal);
  }
  if (status !== null && status !== 0) {
    process.exit(status);
  }
}

export function createAgentCommands(): Command[] {
  return (Object.keys(AGENT_COMMANDS) as AgentName[]).map((agent) => {
    return new Command(agent)
      .description(`Start ${agent} in its agent directory`)
      .allowUnknownOption()
      .allowExcessArguments()
      .action((_options, cmd: Command) => {
        runAgent(agent, cmd.args);
      });
  });
}
