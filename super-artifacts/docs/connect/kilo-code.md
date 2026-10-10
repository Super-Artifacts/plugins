# Kilo Code

> Kilo Code · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

VS Code extension agent. Speaks Streamable HTTP MCP and starts OAuth automatically when the server supports it.

## 1. Add the MCP server

Paste this into kilo.jsonc at the project root (or ~/.config/kilo/kilo.jsonc to make it global).

```
{
  "mcp": {
    "super-artifacts": {
      "type": "remote",
      "url": "https://superartifacts.app/mcp"
    }
  }
}
```

## 2. Connect over OAuth

Kilo Code starts the OAuth flow automatically on first connection — your browser opens a Super Artifacts page naming the account this would publish to. Allow it and Kilo Code holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [Using MCP in Kilo Code](https://kilocode.ai/docs/features/mcp/using-mcp-in-kilo-code).
