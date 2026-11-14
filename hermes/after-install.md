# Connect Super Artifacts

Requires Hermes 0.23.0 or later. Open the **Super Artifacts** tab in `hermes dashboard` and press **Connect**. Open the displayed link on any device; approve only the account you want to use.

Desktop: **Settings → Plugins → Super Artifacts** accepts a key from https://superartifacts.app/api-keys. The dashboard Connect page is in `hermes dashboard`.

The key is saved in this profile's `.env`. Disconnect removes it locally; revoke it at https://superartifacts.app/agents. Connecting publishes nothing. **Dashboard ready** checks this dashboard, not an existing chat. If tools are missing in chat, run `/reload-mcp` there and approve the reload; do not restart the gateway. Existing chats may retain a credential after Disconnect, so revoke it at the link above.

For the three-line terminal alternative, see [the README](README.md#terminal-alternative).
