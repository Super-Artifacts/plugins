# Windsurf

> Cognition · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

IDE agent. Speaks Streamable HTTP MCP with OAuth, and also reads AGENTS.md from the repository root.

## 1. Add the MCP server

Add it in Settings → Cascade → MCP Servers (or paste this into ~/.codeium/windsurf/mcp_config.json). Windsurf discovers the OAuth endpoints from the server itself.

```
{
  "mcpServers": {
    "super-artifacts": {
      "serverUrl": "{{mcpUrl}}"
    }
  }
}
```

## 2. Connect over OAuth

Windsurf prompts to authenticate when the server is first used — approve it and your browser opens a Super Artifacts page naming the account this would publish to. Allow it and Windsurf holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [MCP in Windsurf Cascade](https://docs.windsurf.com/windsurf/cascade/mcp).
