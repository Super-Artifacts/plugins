# Super Artifacts for ChatGPT and Codex

Publish what your agent builds as a live page at its own URL, collect what visitors
submit, and read it back, from ChatGPT or Codex. This folder is one package both
read: the hosted [Super Artifacts](https://superartifacts.app) MCP server and
nothing else. It has no skills, no commands and no code.

- `plugin.json`: the listing (name, description, starter prompts, logo, links).
- `mcp.json`: the `super-artifacts` server at `https://superartifacts.app/mcp`,
  over Streamable HTTP, signing in by OAuth dynamic client registration.

## What it looks like

The screens below are the real product with demo data, in the order you meet them.

<p align="center">
  <img src="https://raw.githubusercontent.com/Super-Artifacts/plugins/main/assets/screenshots/01-connect-consent.png" alt="The Authorize this connection page: The agent wants to publish artifacts to the account northlight, with Deny and Allow buttons." width="720">
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
  <sub>4. What visitors submit lands in a hosted database, the same rows your agent reads back with <code>super_data</code>. (Demo data.)</sub>
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

- "Publish a one-page supper-club reservation form and give me the link."
- "Show me what people have submitted to my reservation page."
- "Add a vegetarian option to my reservation form and publish a new version."

Connecting publishes nothing: the agent builds only what you ask for.

## Install

**Codex**, from the terminal:

```bash
codex plugin marketplace add Super-Artifacts/plugins
```

Then open the plugin directory in Codex, install **Super Artifacts**, and sign in
when it asks.

**ChatGPT:** install **Super Artifacts** from the plugin directory once it is
listed. To try it before then, enable developer mode, open **Plugins**, choose
**Add custom MCP server**, enter `https://superartifacts.app/mcp` and sign in.

Without a plugin, one line connects Codex to the same server:

```bash
codex mcp add super-artifacts --url https://superartifacts.app/mcp
```

then `codex mcp login super-artifacts`.

## Sign in

Super Artifacts signs in with OAuth. There is no API key, and nothing secret lives
in this package. A Super Artifacts page opens in your browser and names the account
the agent would publish to; press **Allow** only if that account is yours. Revoke
it at any time from your [agents page](https://superartifacts.app/agents).

## Privacy

- Every tool call goes to `https://superartifacts.app/mcp` over HTTPS. The package
  makes no other network call and sends no telemetry.
- What you publish, and what visitors submit to a page, is stored on Super
  Artifacts' servers and read back by the account that published it.
- Artifacts are private by default: only your account and the people you share one
  with can open it.

[Privacy policy](https://superartifacts.app/privacy) ·
[Support](https://superartifacts.app/contact) ·
[Docs](https://superartifacts.app/docs)
