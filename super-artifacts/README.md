# Super Artifacts for Claude

Publish what your agent builds as a live page at its own URL, collect what visitors
submit, and read it back, from Claude Code, Claude Desktop, Cowork and claude.ai.
This plugin is the hosted [Super Artifacts](https://superartifacts.app) MCP server
and nothing else: no commands, no scripts, no code runs on your machine.

- `.mcp.json`: the `super-artifacts` server at `https://superartifacts.app/mcp`,
  over Streamable HTTP, signing in with OAuth.
- `docs/connect/`: one page for each of twenty-four other agents.

## What it looks like

The screens below are the real product with demo data, in the order you meet them.

<p align="center">
  <img src="https://raw.githubusercontent.com/Super-Artifacts/plugins/main/assets/screenshots/01-connect-consent.png" alt="The Authorize this connection page: Claude Code wants to publish artifacts to the account northlight, with Deny and Allow buttons." width="720">
  <br>
  <sub>1. Connecting names the account first and lists what the key can and cannot do. Nothing is published yet.</sub>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Super-Artifacts/plugins/main/assets/screenshots/04-agents-connected.png" alt="The Agents page of the Super Artifacts dashboard: Claude Code listed as a connected agent with its key, six artifacts and a Revoke key button." width="720">
  <br>
  <sub>2. Once you allow it, the agent shows up on your Agents page, with a Revoke key button. (Demo data.)</sub>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Super-Artifacts/plugins/main/assets/screenshots/02-artifact-on-phone.png" alt="A published artifact open on a phone: a supper-club page with a three-course menu and a reservation form with name, evening and seat pickers." width="280">
  <br>
  <sub>3. Ask for a page and you get a link that opens on a phone. (Demo data.)</sub>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Super-Artifacts/plugins/main/assets/screenshots/03-data-read-back.png" alt="The Data page of an artifact in the Super Artifacts dashboard: a table of nine reservation responses." width="720">
  <br>
  <sub>4. What visitors submit lands in a hosted database, the same rows Claude reads back with <code>super_data</code>. (Demo data.)</sub>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Super-Artifacts/plugins/main/assets/screenshots/05-gallery.png" alt="The Gallery in the Super Artifacts dashboard: six artifacts in a list, each with its title, visibility and version." width="720">
  <br>
  <sub>5. Everything it publishes, in one gallery, private unless you open it. (Demo data.)</sub>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Super-Artifacts/plugins/main/assets/screenshots/06-artifact-versions.png" alt="The Versions tab of an artifact: v3 live, with v2 and v1 below it and a Restore this version button on each." width="720">
  <br>
  <sub>6. Publish again at the same slug and it becomes a new version; any earlier one can be restored. (Demo data.)</sub>
</p>

## Try it

After you connect, ask in your own words:

- "Publish a one-page supper-club reservation form and give me the link."
- "Show me what people have submitted to my reservation page."
- "Add a vegetarian option to the form and publish a new version."

The same slug makes a new version at the same URL. Connecting publishes nothing:
Claude builds only what you ask for.

## Install

**Claude Code**, as two separate prompts:

```text
/plugin marketplace add Super-Artifacts/plugins
```

```text
/plugin install super-artifacts@super-artifacts
```

Then run `/mcp` and choose **Authenticate** next to `super-artifacts`.

**Claude Desktop, Cowork and claude.ai:** open **Customize, Plugins**, add the
marketplace `https://github.com/Super-Artifacts/plugins`, install Super Artifacts,
then open its **Connectors** tab and connect.

Without a plugin, one line connects Claude Code to the same server:

```bash
claude mcp add --transport http super-artifacts https://superartifacts.app/mcp
```

## Sign in

Super Artifacts signs in with OAuth. There is no API key, and nothing secret lives
in this plugin. Your browser opens a page that names the account the connection
would publish to; press **Allow** only if that account is yours. Revoke it at any
time from your [agents page](https://superartifacts.app/agents).

## Privacy

- Every tool call goes to `https://superartifacts.app/mcp` over HTTPS. The plugin
  makes no other network call and sends no telemetry.
- What you publish, and what visitors submit to a page, is stored on Super
  Artifacts' servers and read back by the account that published it.
- Artifacts are private by default: only your account and the people you share one
  with can open it.

[Privacy policy](https://superartifacts.app/privacy) ·
[Support](https://superartifacts.app/contact) ·
[Docs](https://superartifacts.app/docs)

## Source

The plugin's source lives in the private
[`Super-Artifacts/superartifacts`](https://github.com/Super-Artifacts/superartifacts)
repository, and this public repository is synced from it on every merge. Please do
not commit here directly; the next sync overwrites it. MIT licensed.
