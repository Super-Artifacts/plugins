# Zed

> Zed Industries · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

Editor with a built-in agent. A remote context server with no Authorization header runs the standard MCP OAuth flow.

## 1. Add the context server

Settings → AI → MCP Servers → Add Server → Add Remote Server (or paste this into settings.json). Zed discovers the OAuth endpoints from the server itself.

```
{
  "context_servers": {
    "super-artifacts": {
      "url": "{{mcpUrl}}"
    }
  }
}
```

## 2. Connect over OAuth

Zed prompts to authenticate because the server entry carries no Authorization header — approve it and your browser opens a Super Artifacts page naming the account this would publish to. Allow it and Zed holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [Model Context Protocol in Zed](https://zed.dev/docs/ai/mcp).
