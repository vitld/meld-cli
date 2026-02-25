import { Command } from "commander";
import { genCommand } from "./gen.js";
import { initCommand } from "./init.js";
import { projectCommand } from "./project.js";
import { openCommand } from "./open.js";
import { updateCommand } from "./update.js";
import { createAgentCommands } from "./run.js";

export function createCli(): Command {
  const program = new Command("meld")
    .description("Agent-agnostic settings generator")
    .version(__VERSION__);

  program.addCommand(initCommand);
  program.addCommand(genCommand);
  program.addCommand(projectCommand);
  program.addCommand(openCommand);
  program.addCommand(updateCommand);

  for (const cmd of createAgentCommands()) {
    program.addCommand(cmd);
  }

  return program;
}
