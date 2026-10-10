# Qwen Code

> Alibaba · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

Terminal agent originally forked from Gemini CLI, now developed independently. Speaks Streamable HTTP MCP with OAuth discovery.

## 1. Add the MCP server

Paste this into .qwen/settings.json for one project, or ~/.qwen/settings.json to make it global. Qwen Code discovers the OAuth endpoints from the server itself.

```
{
  "mcpServers": {
    "super-artifacts": {
      "httpUrl": "https://superartifacts.app/mcp"
    }
  }
}
```

## 2. Connect over OAuth

Open the /mcp dialog and authenticate super-artifacts. Your browser opens a Super Artifacts page naming the account this would publish to; allow it and Qwen Code holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [Connect Qwen Code to tools via MCP](https://qwenlm.github.io/qwen-code-docs/en/users/features/mcp/).
