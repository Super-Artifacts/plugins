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
    oauth:
      flow: device
```

## 2. Sign in with a code

Hermes cannot open a browser from a chat, so it signs in with a code: run this, keep it running, and show the person the web address and the short code it prints. They open the address on any device, type the code and press Allow on the Super Artifacts page naming the account this would publish to — that is the whole step. The command waits up to five minutes; if it times out, run it again for a fresh code. Hermes holds its own key afterwards, revocable from the agents page. Connecting publishes nothing.

```
hermes mcp login super-artifacts --flow device
```

## 3. Load the tools

The person sends /reload-mcp in the chat — a slash command only they can send. No restart is needed: the session and its history stay.

## 4. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [MCP in Hermes Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp/).
