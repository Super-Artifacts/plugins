# Hermes

> Nous Research · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

Local agent with a shell, a gateway and its own skill registry. Speaks Streamable HTTP MCP with OAuth 2.1.

## 1. Connect in Hermes

Requires Hermes 0.23.0 or later. Install and enable the Super Artifacts package. In hermes dashboard, open the Super Artifacts tab and press Connect. Open the displayed link on any device and approve only the account you want to publish as. Desktop Settings → Plugins → Super Artifacts also accepts a key from the API keys page. The key stays in the current profile’s .env. Connecting publishes nothing.

## 2. Terminal alternative

Type these three lines yourself, one at a time, including over SSH. If you use a profile, start every line with that profile's command instead of hermes. The second prints an address and a short code: open it on any device, enter the code, press Allow and wait for Authenticated before the third line. The key is revocable from the agents page. There is no restart. A native server entry takes precedence over the package's header template; use one connection path per profile.

```
hermes config set mcp_servers.super-artifacts '{"url":"https://superartifacts.app/mcp","auth":"oauth","oauth":{"flow":"device"},"enabled":false}'
hermes mcp login super-artifacts
hermes config set mcp_servers.super-artifacts.enabled true
```

## 3. Build the first artifact, on your command

Connecting never builds. Ask for a private page, form or tracker. Links open in your browser on a phone. Disconnect removes the local key; revoke it from the Agents page in your Super Artifacts dashboard.

Checked against [MCP in Hermes Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp/).
