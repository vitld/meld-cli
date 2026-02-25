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

Agent-agnostic settings generator for AI coding agents.

## The spirit of the project

Think of meld as IoC but for agentic workflows and setups. Let's call it AIaC?
The goal is to mirror your preferred settings across multiple agent CLIs in a small and lightweight tool centralized to a single entry-point or workspace.
Setup your context, your MCPs (and other settings) and your projects once.

And yes, it's 100% vibe coded. If you find issues, please report!

## Contribution & Issues
Contributions are welcome! But try to keep it within the spirit of the project. Avoid leaning into the "agent runner and orchestration" space unless it can be done cleanly and without massive overhaul. Other than that, open for suggestions and ideas!

Some known limitations:
* Windows support (no clue if it works, haven't tested, probably not?)

## What it does

Meld creates a **hub** — a shared workspace that sits above your projects and generates per-agent configuration files. Define your projects, MCP servers, and instructions once in `meld.jsonc`, then run `meld gen` to produce native config files for each agent.

Supported agents:

| Agent | Generates |
|-------|-----------|
| Claude Code | `CLAUDE.md`, `.mcp.json` |
| Codex CLI | `AGENTS.md`, `.codex/config.toml` |
| Gemini CLI | `GEMINI.md`, `.gemini/settings.json` |

## Install

```bash
npm install -g @vitld/meld-cli
# or
pnpm add -g @vitld/meld-cli
```

The package installs as `@vitld/meld-cli` but the command is `meld`.

## Quick start

```bash
mkdir my-hub && cd my-hub
meld init
meld project add
meld gen
meld claude-code   # or: meld codex-cli, meld gemini-cli
```

## Hub structure

```
my-hub/
  meld.jsonc          # Central configuration
  context/            # Markdown instructions for agents
  commands/           # Slash commands
  skills/             # Reusable agent skills
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
      "repo": "org/my-app"
    }
  },
  "mcp": {
    // MCP servers — see below
  }
}
```

## Commands

| Command | Description |
|---------|-------------|
| `meld init` | Initialize a new hub |
| `meld gen` | Generate agent configs from `meld.jsonc` |
| `meld gen --dry-run` | Preview without writing files |
| `meld project add` | Register a project |
| `meld project list` | List registered projects |
| `meld open` | Open workspace in IDE |
| `meld update` | Re-scaffold hub structure |
| `meld claude-code` | Launch Claude Code in the agent directory |
| `meld codex-cli` | Launch Codex CLI in the agent directory |
| `meld gemini-cli` | Launch Gemini CLI in the agent directory |

## MCP servers

MCP servers are defined once in `meld.jsonc` under the `mcp` key and automatically translated into each agent's native config format.

### Stdio server

```jsonc
"my-server": {
  "command": "npx",
  "args": ["-y", "my-mcp-server@latest"],
  "env": {
    "API_KEY": "sk-..."
  }
}
```

### HTTP server

```jsonc
"my-server": {
  "type": "http",
  "url": "https://mcp.example.com/mcp",
  "headers": {
    "Authorization": "Bearer tok-..."
  }
}
```

### Scoping servers to agents

By default every MCP server is available to all enabled agents. Use `agents` to restrict:

```jsonc
"my-server": {
  "command": "node",
  "args": ["server.js"],
  "agents": ["claude-code"]
}
```

## Context & instructions

Files in the root of `context/` are inlined into agent instruction files (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`). Subfolders are copied into each agent's working directory so you can reference them with relative paths.

```
context/
  01-role.md          # Inlined (alphabetical order)
  02-guardrails.md    # Inlined
  reference/          # Copied as agents/<name>/reference/
    api.md
    patterns.md
```

Use numeric prefixes to control ordering. Run `meld gen` after editing.

## Team usage

A meld hub can be shared across a team by committing it to version control. The key insight: `meld.jsonc` contains absolute project paths that differ per machine, so it should be gitignored — similar to how teams share `.env.example` files but gitignore the actual `.env`.

### Recommended `.gitignore`

Add these to the meld-managed section of your hub's `.gitignore`:

```gitignore
# ── meld managed (do not edit) ──
agents/
scratch/
# ── end meld managed ──

# Team additions
meld.jsonc
```

### What to commit

| Path | Commit? | Why |
|------|---------|-----|
| `context/` | Yes | Shared agent instructions |
| `commands/` | Yes | Shared slash commands |
| `skills/` | Yes | Shared skills |
| `artifacts/` | Yes | Shared research and notes |
| `meld.jsonc` | No | Contains machine-specific project paths |
| `meld.schema.json` | Yes | Generated by meld, but enables IDE autocompletion for teammates |
| `agents/` | No | Generated output (already gitignored) |
| `scratch/` | No | Temporary work (already gitignored) |

### Onboarding a new team member

1. Clone the hub repo
2. Get a copy of `meld.jsonc` from a teammate (or keep a `meld.example.jsonc` in the repo)
3. Update the project paths to match local checkout locations
4. Run `meld gen` to generate agent configs

> **Tip:** You can commit a `meld.example.jsonc` with placeholder paths as a template for new team members, the same way you'd commit an `.env.example`.

## Requirements

Node.js >= 20

## License

[GPL-3.0-only](LICENSE)
