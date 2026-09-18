# Claude Desktop & claude.ai

> Anthropic · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes through a connector · kept in Connector, plus an uploaded skill

Hosted chat. Reaches anything outside itself through a connector.

## 1. Add the connector

Settings → Connectors → Add custom connector, and paste this URL. Anthropic’s cloud calls it, not your machine, so it has to be a public address — which this is.

```
{{mcpUrl}}
```

## 2. Then connect it over OAuth

Claude will offer a Connect or Sign in button for the connector. That opens a Super Artifacts page asking whether to let it publish here, and names the account it would publish to. Allow it and the connector holds its own key — which appears in the roster above and can be revoked from there. Connecting publishes nothing; pick a prompt from the panel beside the roster when you are ready.

## 3. Optional: upload the skill

Settings → Features takes a custom skill as a zip, on Pro, Max, Team and Enterprise with code execution on. Worth doing if you publish often; the connector alone is enough to work.

Checked against [Custom connectors using remote MCP](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).
