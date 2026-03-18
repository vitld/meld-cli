```
 ███╗   ███╗ ███████╗ ██╗      ██████╗
 ████╗ ████║ ██╔════╝ ██║      ██╔══██╗
 ██╔████╔██║ █████╗   ██║      ██║  ██║
 ██║╚██╔╝██║ ██╔══╝   ██║      ██║  ██║
 ██║ ╚═╝ ██║ ███████╗ ███████╗ ██████╔╝
 ╚═╝     ╚═╝ ╚══════╝ ╚══════╝ ╚═════╝
```

[![npm](https://img.shields.io/npm/v/@vitld/meld-cli)](https://www.npmjs.com/package/@vitld/meld-cli)
[![license](https://img.shields.io/github/license/vitld/meld-cli)](LICENSE)
[![CI](https://github.com/vitld/meld-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/vitld/meld-cli/actions/workflows/ci.yml)

Agent-agnostic settings generator for AI coding agents. Define your projects, context, MCP servers, and skills once — generate native configs for Claude Code, Codex CLI, and Gemini CLI.

## Install

Run directly without installing:

```bash
npx @vitld/meld-cli init
# or
pnpm dlx @vitld/meld-cli init
```

Or install globally:

```bash
npm install -g @vitld/meld-cli
# or
pnpm add -g @vitld/meld-cli
```

The global install exposes the `meld` command.

## Quick start

```bash
mkdir my-hub && cd my-hub
meld init
meld project add
meld gen
meld claude-code   # or: meld codex-cli, meld gemini-cli
```

## How it works

Meld creates a **hub** — a shared workspace that sits above your projects. You configure everything in one place (`meld.jsonc`), and `meld gen` produces native config files for each agent:

| Agent | Generated files |
|-------|-----------------|
| Claude Code | `CLAUDE.md`, `.mcp.json`, `.claude/settings.json` |
| Codex CLI | `AGENTS.md`, `.codex/config.toml` |
| Gemini CLI | `GEMINI.md`, `.gemini/settings.json` |

Meld also generates a `.code-workspace` file and manages `.gitignore` entries.

## Hub structure

```
my-hub/
  meld.jsonc          # Central configuration
  context/            # Markdown instructions for agents
  skills/             # Reusable agent skills (SKILL.md per skill)
  artifacts/          # Research, plans, and notes
  scratch/            # Temporary work (gitignored)
  agents/             # Generated output (gitignored)
```

## Configuration

All configuration lives in `meld.jsonc` at the hub root:

```jsonc
{
  "$schema": "./meld.schema.json",
  "ide": {
    "default": "cursor",         // "cursor" | "code" | "windsurf"
    "workspaceName": "my-hub"
  },
  "agents": {
    "claude-code": { "enabled": true },
    "codex-cli": { "enabled": false },
    "gemini-cli": { "enabled": false }
  },
  "projects": {
    "my-app": {
      "path": "/absolute/path/to/my-app",
      "aliases": ["app"],
      "repo": "org/my-app"       // optional — used in project table
    }
  },
  "mcp": {},
  "context": "./context/",        // optional — custom context directory
  "enable-external-skills": false  // optional — discover skills from .agents/skills/
}
```

### Agents

Each agent supports these options:

| Option | Required | Description |
|--------|----------|-------------|
| `enabled` | Yes | Enable config generation |
| `dir` | No | Custom subdirectory under `agents/` (defaults: `claude-code`, `codex`, `gemini`) |
| `overrides` | No | Deep-merged into the agent's generated settings file |

Overrides let you customize generated configs without editing output files. What you can override depends on the agent's native format:

```jsonc
"agents": {
  "claude-code": {
    "enabled": true,
    "overrides": {
      "env": { "CLAUDE_CODE_MAX_TURNS": "50" }  // → .claude/settings.json
    }
  },
  "codex-cli": {
    "enabled": true,
    "overrides": {
      "approval_policy": "never"                 // → .codex/config.toml
    }
  }
}
```

### MCP servers

Defined once under `mcp`, automatically translated into each agent's native format (`.mcp.json`, `.codex/config.toml`, `.gemini/settings.json`).

**Stdio server** (local process):

```jsonc
"my-server": {
  "command": "npx",
  "args": ["-y", "my-mcp-server@latest"],
  "env": { "API_KEY": "sk-..." }
}
```

**HTTP server** (remote):

```jsonc
"my-server": {
  "type": "http",
  "url": "https://mcp.example.com/mcp",
  "headers": { "Authorization": "Bearer tok-..." }
}
```

**Scoping to specific agents** — by default all servers go to all agents:

```jsonc
"my-server": {
  "command": "node",
  "args": ["server.js"],
  "agents": ["claude-code"]
}
```

## Context

Files in the root of `context/` are inlined into agent instruction files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`). Subfolders are copied into each agent's working directory so you can reference them with relative paths.

```
context/
  01-role.md          # Inlined (alphabetical order)
  02-guardrails.md    # Inlined
  reference/          # Copied as agents/<name>/reference/
    api.md
    patterns.md
```

Use numeric prefixes to control ordering. Set `"context": "./my-context/"` to use a custom directory.

## Skills

Skills are reusable agent instructions with frontmatter metadata. Each skill lives in its own directory under `skills/` with a `SKILL.md` file:

```
skills/
  deep-review/
    SKILL.md
```

Skills support YAML frontmatter for metadata like `name`, `description`, and per-agent `model` overrides. They are distributed to each agent's native skill format during `meld gen`.

Set `"enable-external-skills": true` to enable [skills.sh](https://skills.sh/) support — this discovers third-party skills installed in `.agents/skills/` and distributes them alongside your local skills.

## CLI reference

| Command | Description |
|---------|-------------|
| `meld init` | Initialize a new hub |
| `meld gen` | Generate agent configs |
| `meld gen --dry-run` | Preview without writing |
| `meld project add` | Register a project |
| `meld project list` | List registered projects |
| `meld open` | Open workspace in IDE |
| `meld update` | Re-scaffold hub structure and regenerate |
| `meld claude-code` | Launch Claude Code in its agent directory |
| `meld codex-cli` | Launch Codex CLI in its agent directory |
| `meld gemini-cli` | Launch Gemini CLI in its agent directory |

## Team usage

`meld.jsonc` contains absolute project paths that differ per machine, so gitignore it — similar to `.env`. Everything else can be shared.

```gitignore
# ── meld managed (do not edit) ──
agents/
scratch/
# ── end meld managed ──

# Team additions
meld.jsonc
```

| Commit | Don't commit |
|--------|--------------|
| `context/`, `skills/`, `artifacts/` | `meld.jsonc` (machine-specific paths) |
| `meld.schema.json` (IDE autocompletion) | `agents/` (generated, gitignored) |
| | `scratch/` (temporary, gitignored) |

> **Tip:** Commit a `meld.example.jsonc` with placeholder paths as a template for new team members.

## Contributing

Contributions are welcome! Try to keep it within the spirit of the project — a lightweight config generator, not an agent runner or orchestrator.

Known limitations:
* Windows is untested

## Requirements

Node.js >= 20

## License

[GPL-3.0-only](LICENSE)
