# Manus

> Manus · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes through a connector · kept in Connector

Hosted autonomous agent platform. Reaches anything outside its prebuilt connectors through a custom MCP server entry, called from Manus's cloud rather than your machine.

## 1. Add the custom MCP server

Settings → Integrations → Custom MCP Servers → Add Server. Manus's cloud calls this address directly, so it has to be a public URL — which this is. Name it and paste the URL; Manus verifies it can reach the server and lists its tools before the integration goes live.

```
https://superartifacts.app/mcp
```

## 2. Then connect it over OAuth

Manus asks for the credential the server requires when it first calls a tool — this server's answer to that is the same OAuth challenge every entry here uses. A Super Artifacts page names the account this would publish to; allow it and Manus holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [Custom MCP Servers — Manus Documentation](https://manus.im/docs/integrations/custom-mcp).
