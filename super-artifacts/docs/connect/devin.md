# Devin

> Cognition · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

Autonomous engineer with a CLI and a desktop app. Speaks Streamable HTTP MCP with OAuth (dynamic client registration).

## 1. Add the MCP server

One command. Devin infers the Streamable HTTP transport from the URL and saves it to user scope so every project sees it.

```
devin mcp add super-artifacts {{mcpUrl}}
```

## 2. Connect over OAuth

Run devin mcp login super-artifacts. Your browser opens a Super Artifacts page naming the account this would publish to; allow it and Devin holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [MCP configuration in Devin CLI](https://docs.devin.ai/cli/extensibility/mcp/configuration).
