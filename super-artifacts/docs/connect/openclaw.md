# OpenClaw

> Open source · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

Self-hosted agent reachable from chat apps. Speaks Streamable HTTP MCP with OAuth saved by openclaw mcp login.

## 1. Save the MCP server

One command. OpenClaw saves the definition into its own config, ready for every runtime it projects into.

```
openclaw mcp set super-artifacts '{"url":"{{mcpUrl}}","transport":"streamable-http","auth":"oauth"}'
```

## 2. Connect over OAuth

Run openclaw mcp login super-artifacts. Your browser opens a Super Artifacts page naming the account this would publish to; allow it and OpenClaw holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [Transports and OAuth in OpenClaw](https://docs.openclaw.ai/cli/mcp/transports).
