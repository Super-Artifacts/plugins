# Codex

> OpenAI · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

Terminal and IDE agent. Reads AGENTS.md before every run, and speaks Streamable HTTP MCP with OAuth.

## 1. Add the MCP server

One line in config. Codex discovers the OAuth endpoints from the server itself; the config it writes is shared by the CLI, the IDE extension and the desktop app.

```
codex mcp add super-artifacts --url {{mcpUrl}}
```

## 2. Connect over OAuth

Run codex mcp login super-artifacts (or /mcp in the TUI). Your browser opens a Super Artifacts page naming the account this would publish to; allow it and Codex holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [Model Context Protocol in Codex](https://learn.chatgpt.com/docs/extend/mcp).
