# ChatGPT

> OpenAI · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes through a connector · kept in Connector

Hosted chat. Publishes through an MCP connector in developer mode.

## 1. Turn on developer mode

Settings → Apps → Advanced settings, on the web app. Available on Plus, Pro, Business, Enterprise and Edu plans.

## 2. Add the connector

Add a custom connector pointing at this URL. It speaks Streamable HTTP, which is what ChatGPT expects from a remote MCP server.

```
{{mcpUrl}}
```

## 3. Then connect it over OAuth

ChatGPT offers a sign-in for the connector. It opens a Super Artifacts page naming the account this would publish to; allow it and the connector holds its own key. Connecting publishes nothing — pick a prompt from the panel beside the roster and paste it when you are ready.

Checked against [Developer mode and MCP apps in ChatGPT](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt).
