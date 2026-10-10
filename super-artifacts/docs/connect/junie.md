# Junie

> JetBrains · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

AI coding agent built into JetBrains IDEs. Takes a remote server URL in its own mcp.json; auth follows whatever the server declares.

## 1. Add the MCP server

Settings → Tools → Junie → MCP Settings, then edit the mcp.json this opens (or add .junie/mcp/mcp.json to the project root by hand). Junie reads the same "mcpServers" shape most MCP clients use.

```
{
  "mcpServers": {
    "super-artifacts": {
      "url": "https://superartifacts.app/mcp"
    }
  }
}
```

## 2. Connect over OAuth

Junie follows whatever auth the server asks for — this one challenges with OAuth on first use, so your browser opens a Super Artifacts page naming the account this would publish to. Allow it and Junie holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [MCP Settings — Junie](https://junie.jetbrains.com/docs/junie-plugin-mcp-settings.html).
