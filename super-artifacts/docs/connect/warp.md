# Warp

> Warp · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

AI-native terminal with an agent mode. Adds remote MCP servers from a settings panel, with one-click OAuth where the server offers it.

## 1. Add the MCP server

Settings → Agents → MCP Servers → Add (or Warp Drive → Personal → MCP Servers), and enter this URL as a Server-Sent Events / Streamable HTTP server.

```
{
  "super-artifacts": {
    "url": "https://superartifacts.app/mcp"
  }
}
```

## 2. Connect over OAuth

Warp offers a one-click Connect for servers that support OAuth, which this one does — approve it and your browser opens a Super Artifacts page naming the account this would publish to. Allow it and Warp holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [Model Context Protocol (MCP) in Warp](https://docs.warp.dev/knowledge-and-collaboration/mcp).
