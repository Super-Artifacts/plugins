# Goose

> Block · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

Open-source local agent from Block, CLI and desktop sharing one config. Remote Streamable HTTP extensions run their OAuth flow at the start of a session.

## 1. Add the extension

Run goose configure → Add Extension → Remote Extension (Streamable HTTP), and give it this URI. The CLI and Goose Desktop share one config file, so it shows up in both.

```
https://superartifacts.app/mcp
```

## 2. Connect over OAuth

No sign-in window appears until Goose actually opens the extension, so start a new session. Your browser opens a Super Artifacts page naming the account this would publish to; allow it and Goose holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [Using Extensions in Goose](https://block.github.io/goose/docs/getting-started/using-extensions/).
