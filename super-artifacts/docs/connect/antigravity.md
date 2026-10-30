# Antigravity

> Google · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

Google's agentic IDE and CLI. Shares one MCP config across both, with OAuth for remote Streamable HTTP servers.

## 1. Add the MCP server

Paste this into ~/.gemini/config/mcp_config.json (or .agents/mcp_config.json for one project) — the IDE and CLI both read it. In the IDE you can instead use the "..." menu → Manage MCP Servers → View raw config.

```
{
  "mcpServers": {
    "super-artifacts": {
      "serverUrl": "https://superartifacts.app/mcp"
    }
  }
}
```

## 2. Connect over OAuth

Open Agent Settings and click Authenticate beside the server. Your browser opens a Super Artifacts page naming the account this would publish to; allow it and Antigravity holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [MCP servers in Antigravity](https://antigravity.google/docs/mcp/).
