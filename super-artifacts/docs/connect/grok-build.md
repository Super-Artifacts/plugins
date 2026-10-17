# Grok Build

> xAI · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

xAI's terminal coding agent (grok-build-0.1). Reads MCP servers from config.toml, with OAuth on first use for remote servers.

## 1. Add the MCP server

One command, or add a [mcp_servers.super-artifacts] block with a url field directly to ~/.grok/config.toml.

```
grok mcp add --transport http super-artifacts https://superartifacts.app/mcp
```

## 2. Connect over OAuth

A server that needs OAuth triggers the browser flow the first time Grok Build calls it — no separate login command. Allow the Super Artifacts page naming the account this would publish to; the token is stored under ~/.grok/mcp_credentials.json and is revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [MCP servers in Grok Build](https://docs.x.ai/build/features/mcp-servers).
