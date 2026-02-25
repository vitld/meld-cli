import { homedir } from "node:os";
import type { MeldConfig } from "../config/types.js";
import type { ComposedContext } from "../context/types.js";
import type { Generator, GeneratedFile } from "./types.js";

export class WorkspaceGenerator implements Generator {
  name = "workspace";

  generate(config: MeldConfig, _context: ComposedContext): GeneratedFile[] {
    const folders = [
      { name: config.ide.workspaceName, path: "." },
      ...Object.entries(config.projects).map(([name, project]) => ({
        name,
        path: resolveTilde(project.path),
      })),
    ];

    const workspace = {
      folders,
      settings: {},
    };

    return [
      {
        path: `${config.ide.workspaceName}.code-workspace`,
        content: JSON.stringify(workspace, null, 2),
      },
    ];
  }
}

function resolveTilde(path: string): string {
  if (path.startsWith("~/")) {
    return homedir() + path.slice(1);
  }
  return path;
}
