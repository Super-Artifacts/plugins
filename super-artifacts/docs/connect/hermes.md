# Hermes

> Nous Research · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

Local agent with a shell, a gateway and its own skill registry. Speaks Streamable HTTP MCP with OAuth 2.1.

## 1. Add the MCP server

Add this under mcp_servers in the profile's config. Hermes discovers the OAuth endpoints from the server itself.

```
mcp_servers:
  super-artifacts:
    url: {{mcpUrl}}
    auth: oauth
```

## 2. Connect over OAuth

Hermes runs the OAuth flow on first use — your browser opens a Super Artifacts page naming the account this would publish to. Allow it and Hermes holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [MCP in Hermes Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp/).
