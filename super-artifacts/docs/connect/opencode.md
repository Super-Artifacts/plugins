# OpenCode

> SST · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

Open-source terminal coding agent. Config-file MCP with automatic OAuth via Dynamic Client Registration for remote servers.

## 1. Add the MCP server

Add this under mcp in opencode.jsonc (project) or the global config. The empty oauth object turns on automatic OAuth handling.

```
{
  "mcp": {
    "super-artifacts": {
      "type": "remote",
      "url": "https://superartifacts.app/mcp",
      "oauth": {}
    }
  }
}
```

## 2. Connect over OAuth

Run opencode mcp auth super-artifacts. Your browser opens a Super Artifacts page naming the account this would publish to; allow it and OpenCode holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [MCP servers in OpenCode](https://opencode.ai/docs/mcp-servers/).
