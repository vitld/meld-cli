import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "./config/loader.js";
import { interpolateEnv } from "./config/interpolate.js";
import { composeContext } from "./context/composer.js";
import { writeGeneratedFiles, writeGeneratedSkillDirs } from "./generators/writer.js";
import { ClaudeCodeGenerator } from "./generators/claude-code.js";
import { CodexCliGenerator } from "./generators/codex-cli.js";
import { GeminiCliGenerator } from "./generators/gemini-cli.js";
import { WorkspaceGenerator } from "./generators/workspace.js";
import { GitignoreGenerator } from "./generators/gitignore.js";
import type { Generator, GeneratedFile, GeneratedSkillDir } from "./generators/types.js";
import { resolveAgentDir, AGENTS_DIR } from "./config/types.js";
import type { AgentName, AgentConfig } from "./config/types.js";

export interface GenerateOptions {
  dryRun?: boolean;
  agent?: AgentName;
}

type GenerateResult =
  | { ok: true; files: GeneratedFile[]; warnings: string[]; hubName: string }
  | { ok: false; errors: string[] };

const AGENT_GENERATORS: Record<AgentName, () => Generator> = {
  "claude-code": () => new ClaudeCodeGenerator(),
  "codex-cli": () => new CodexCliGenerator(),
  "gemini-cli": () => new GeminiCliGenerator(),
};

export function generate(
  hubDir: string,
  options: GenerateOptions = {},
): GenerateResult {
  const loadResult = loadConfig(hubDir);
  if (!loadResult.ok) {
    return { ok: false, errors: loadResult.errors };
  }

  const { config, warnings } = interpolateEnv(loadResult.config);
  const context = composeContext(hubDir, config);

  const allFiles: GeneratedFile[] = [];
  const allSkillDirs: GeneratedSkillDir[] = [];

  for (const [name, agentConfig] of Object.entries(config.agents) as [AgentName, AgentConfig][]) {
    if (!agentConfig.enabled) continue;
    if (options.agent && options.agent !== name) continue;

    const agentDir = resolveAgentDir(name, agentConfig);
    const factory = AGENT_GENERATORS[name];
    if (!factory) continue;

    const output = factory().generate(config, context);
    for (const file of output.files) {
      file.path = `${AGENTS_DIR}/${agentDir}/${file.path}`;
    }
    allFiles.push(...output.files);

    for (const skillDir of output.skillDirs) {
      skillDir.outputDir = `${AGENTS_DIR}/${agentDir}/${skillDir.outputDir}`;
    }
    allSkillDirs.push(...output.skillDirs);
  }

  if (!options.agent) {
    allFiles.push(...new WorkspaceGenerator().generate(config, context).files);
    allFiles.push(...new GitignoreGenerator().generate(config, context).files);
  }

  // Ensure project artifact dirs exist
  if (!options.dryRun) {
    for (const name of Object.keys(config.projects)) {
      mkdirSync(join(hubDir, "artifacts", "projects", name), { recursive: true });
    }
  }

  writeGeneratedFiles(hubDir, allFiles, { dryRun: options.dryRun });
  writeGeneratedSkillDirs(hubDir, allSkillDirs, { dryRun: options.dryRun });

  return { ok: true, files: allFiles, warnings, hubName: config.ide.workspaceName };
}
