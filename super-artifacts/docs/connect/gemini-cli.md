# Gemini CLI

> Google · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

Terminal agent. Speaks Streamable HTTP MCP with automatic OAuth discovery, and concatenates GEMINI.md files into every prompt.

## 1. Add the MCP server

Paste this into ~/.gemini/settings.json (or .gemini/settings.json for one project). The CLI discovers the OAuth endpoints from the server itself.

```
{
  "mcpServers": {
    "super-artifacts": {
      "httpUrl": "{{mcpUrl}}"
    }
  }
}
```

## 2. Connect over OAuth

Run /mcp auth super-artifacts. Your browser opens a Super Artifacts page naming the account this would publish to; allow it and the CLI holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [MCP servers with the Gemini CLI](https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html).
