# meld

Agent-agnostic settings generator for AI coding agents.

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
npm install -g meld-cli
# or
pnpm add -g meld-cli
```

The package installs as `meld-cli` but the command is `meld`.

## Quick start

```bash
mkdir my-hub && cd my-hub
meld init
meld project add
meld gen
meld claude   # or: meld codex, meld gemini
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
| `meld claude` | Launch Claude Code in the agent directory |
| `meld codex` | Launch Codex CLI in the agent directory |
| `meld gemini` | Launch Gemini CLI in the agent directory |

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

## Requirements

Node.js >= 20

## License

[GPL-3.0-only](LICENSE)
