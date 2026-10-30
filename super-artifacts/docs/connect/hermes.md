# Hermes

> Nous Research · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

Local agent with a shell, a gateway and its own skill registry. Speaks Streamable HTTP MCP with OAuth 2.1.

## 1. Sign in with a code, from a terminal

Type these three lines yourself, in a terminal — on this machine or over SSH, it makes no difference. The first tells Hermes about the server, saved switched off so the plugin's unsigned copy stops failing. The second prints a web address and a short code: open the address on any device, type the code, press Allow on the Super Artifacts page naming the account this would publish to, and wait for Authenticated. The third switches it on; the tools connect within a minute, with no restart. If you use a Hermes profile, start every line with that profile's command instead of hermes. If the tools do not show up, run the same three lines again. Hermes holds its own key afterwards, revocable from the agents page. Connecting publishes nothing.

```
hermes config set mcp_servers.super-artifacts '{"url":"https://superartifacts.app/mcp","auth":"oauth","oauth":{"flow":"device"},"enabled":false}'
hermes mcp login super-artifacts
hermes config set mcp_servers.super-artifacts.enabled true
```

## 2. Add the MCP server by hand (no terminal)

Add this under mcp_servers in the profile's config, switched off until the sign-in is done. Hermes discovers the OAuth endpoints from the server itself.

```
mcp_servers:
  super-artifacts:
    url: https://superartifacts.app/mcp
    auth: oauth
    oauth:
      flow: device
    enabled: false
```

## 3. Sign in with a code

Hermes cannot open a browser from a chat, so it signs in with a code: run this, keep it running, and show the person the web address and the short code it prints. They open the address on any device, type the code and press Allow on the Super Artifacts page naming the account this would publish to — that is the whole step. The command waits up to five minutes; if it times out, run it again for a fresh code. Hermes holds its own key afterwards, revocable from the agents page. Connecting publishes nothing.

```
hermes mcp login super-artifacts
```

## 4. Switch it on

Set enabled: true on the server entry (or run this). The tools connect within a minute with the new key: no reload, and no restart — a restart would end the open chat.

```
hermes config set mcp_servers.super-artifacts.enabled true
```

## 5. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [MCP in Hermes Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp/).
