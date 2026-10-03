# Cursor

> Anysphere · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

IDE agent. Reads AGENTS.md and project rules, and speaks Streamable HTTP MCP with OAuth.

## 1. Add the MCP server

Paste this into ~/.cursor/mcp.json (or .cursor/mcp.json for one project). Cursor discovers the OAuth endpoints from the server itself.

```
{
  "mcpServers": {
    "super-artifacts": {
      "url": "{{mcpUrl}}"
    }
  }
}
```

## 2. Connect over OAuth

Cursor prompts to authenticate the first time the server is used — approve it and your browser opens a Super Artifacts page naming the account this would publish to. Allow it and Cursor holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [Model Context Protocol in Cursor](https://cursor.com/docs/mcp).
