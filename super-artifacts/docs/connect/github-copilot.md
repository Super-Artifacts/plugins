# GitHub Copilot

> GitHub · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

IDE, CLI and coding agent. Speaks Streamable HTTP MCP with OAuth, and also reads repository instruction files.

## 1. Add the MCP server

One command. Copilot CLI stores it in ~/.copilot/mcp-config.json; the docs page also covers the /mcp add form in an interactive session.

```
copilot mcp add --transport http super-artifacts {{mcpUrl}}
```

## 2. Connect over OAuth

Copilot prompts to authenticate when the server is first used — approve it and your browser opens a Super Artifacts page naming the account this would publish to. Allow it and Copilot holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [Adding MCP servers for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers).
