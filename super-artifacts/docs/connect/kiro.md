# Kiro

> AWS · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

Agentic IDE built on VS Code. Speaks Streamable HTTP MCP with browser-based OAuth for remote servers.

## 1. Add the MCP server

Paste this into .kiro/settings/mcp.json for one workspace, or ~/.kiro/settings/mcp.json to make it global. Kiro discovers the OAuth endpoints from the server itself.

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

Kiro prompts to authenticate the first time a tool is used — approve it and your browser opens a Super Artifacts page naming the account this would publish to. Allow it and Kiro holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [Configure MCP servers in Kiro](https://kiro.dev/docs/mcp/configuration/).
