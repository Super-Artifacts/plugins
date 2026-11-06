# Super Artifacts for Hermes Agent

Publish pages, forms and trackers at private URLs, and read back what visitors submit. Requires Hermes 0.23.0 or later.

## Install and connect

```
hermes plugins install super-artifacts --enable
```

Open the **Super Artifacts** tab in `hermes dashboard` and press **Connect**. Open the displayed link on any device and approve only the account you want Hermes to publish as. Connecting publishes nothing. **Dashboard ready** checks the dashboard process; it does not prove an existing chat has loaded the tools. The page asks the running profile gateway to reload, preserving Hermes’s confirmation step. If tools are missing, run `/reload-mcp` in your chat and approve the reload; no gateway restart is needed. Open a dashboard for the profile you want to connect; Hermes 0.23.0 refuses this user plugin’s backend from another profile’s dashboard.

In Desktop, open **Settings → Plugins → Super Artifacts** and paste a key from [API keys](https://superartifacts.app/api-keys). The dashboard Connect page belongs to `hermes dashboard`; Desktop's automatic settings form is a secret field.

The package supplies the bearer header; the key is saved in the current profile's `.env` as `SUPER_ARTIFACTS_KEY`. Keep that file private. **Disconnect** removes the local key and requests a gateway reload. An existing gateway may retain a loaded credential, so local removal does not revoke it. To revoke it on the service, use [Agents](https://superartifacts.app/agents).

## Ask Hermes

Copy a prompt into your chat:

> Publish a private client intake form and give me the link.

> Show me what visitors submitted to my intake form.

The skill asks for a fresh viewer URL whenever you ask to see an artifact. Where Hermes offers `desktop_preview`, it opens the Browser pane. Otherwise the link opens in your browser, including on a phone. Desktop pane viewing is not yet verified by the automated dashboard harness. Viewer URLs expire after ten minutes; ask Hermes to open it again. Owner actions such as Share may open the system browser.

## Terminal alternative

The previous three-line device-code path remains available. Type each line yourself, separately. If you use a profile, start every line with that profile's command instead of `hermes`:

```
hermes config set mcp_servers.super-artifacts '{"url":"https://superartifacts.app/mcp","auth":"oauth","oauth":{"flow":"device"},"enabled":false}'
hermes mcp login super-artifacts
hermes config set mcp_servers.super-artifacts.enabled true
```

The second line prints `Code: XXXX-XXXX` and an address. Open it on any device, enter the code, press **Allow**, and wait for **Authenticated** before the third line. A native server entry of the same name takes precedence over the package entry. Keep this alternative and the dashboard connection in separate profiles to avoid mixing credentials.

## Privacy and scope

This is a hosted connector. Tool calls go to `https://superartifacts.app/mcp`; the dashboard backend also calls Super Artifacts' account, artifact and device sign-in endpoints. Published files and visitor submissions are stored on Super Artifacts servers. The creator key stays in Hermes's profile `.env`, never in the page JavaScript. No telemetry is added by the package.

Publish private unless you explicitly ask to share an artifact. No private artifact is embedded in a plugin iframe. The hosted MCP tools and the original portable package predate November 4, 2026. This week's additions are the header template, secret settings schema, dashboard connection page and the skill's Browser-pane instructions.

[Documentation](https://superartifacts.app/docs).
