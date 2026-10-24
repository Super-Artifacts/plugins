# Amp

> Sourcegraph · tier: **MCP** — connects through MCP; OAuth through the harness itself · publishes directly · kept in MCP config

Terminal and VS Code agent from Sourcegraph. amp mcp remote add drives its own OAuth flow through ampcode.com.

## 1. Add the MCP server

One command. Amp manages the remote definition through ampcode.com rather than a local settings file.

```
amp mcp remote add super-artifacts https://superartifacts.app/mcp --auth oauth --personal
```

## 2. Connect over OAuth

The command opens your browser to a Super Artifacts page naming the account this would publish to; allow it and Amp holds its own key, revocable from the agents page. Connecting publishes nothing.

## 3. Build the first artifact, on your command

Connecting never builds. The super_* tools are ready — ask for an artifact in your own words and paste a prompt of your choosing.

Checked against [MCP in Amp](https://ampcode.com/docs/customize/mcp).
