# Cline

> Cline · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

VS Code extension agent with a shell. Remote MCP servers are Streamable HTTP with a bearer header — no dedicated OAuth flow documented, so the key is pasted rather than granted.

## 1. Open an artifact-scoped key

Cline's docs describe remote servers authenticating with a bearer header, not an OAuth consent screen — generate a key from the agents page first.

```
<your key>
```

Copy your key from the [API keys page](https://superartifacts.app/api-keys) and paste it in place of `<your key>`.

## 2. Add the MCP server

MCP Servers → Configure → Configure MCP Servers opens cline_mcp_settings.json. Add this block with the key from the previous step.

```
{
  "mcpServers": {
    "super-artifacts": {
      "type": "streamableHttp",
      "url": "https://superartifacts.app/mcp",
      "headers": {
        "Authorization": "Bearer <your key>"
      }
    }
  }
}
```

## 3. Build the first artifact, on your command

Restart VS Code so Cline picks up the new server, then ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [Connecting to a Remote MCP Server in Cline](https://docs.cline.bot/mcp/configuring-mcp-servers).
