# Claude Code

> Anthropic · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

Terminal agent with a shell and full network access. Speaks remote MCP with OAuth 2.0, so it gets the MCP tier.

## 1. Add the MCP server

One command. Claude Code discovers the OAuth endpoints from the server itself — no skill file, no key to paste.

```
claude mcp add --transport http super-artifacts {{mcpUrl}}
```

## 2. Connect over OAuth

Run /mcp and authenticate, or claude mcp login super-artifacts. Your browser opens a Super Artifacts page naming the account this would publish to; allow it and Claude Code holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp).
