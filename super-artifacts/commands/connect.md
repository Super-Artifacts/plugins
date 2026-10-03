---
description: Connect this Claude Code session to your Super Artifacts account over OAuth — consent screen in the browser, key stored locally, revocable from the agents page.
argument-hint: "[--api <origin>]"
---

# /connect

Run this **once** on a machine, or again after revoking. Like Vercel's MCP
connection, the plugin registers itself over OAuth, your browser opens the
Super Artifacts consent screen, and the key it hands back is written to
`~/.config/super-artifacts/key` (mode 600). Works from any CLI tool — Claude
Code, Cursor, OpenCode, Pi, or anything with a plugin system.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/connect.mjs" $ARGUMENTS
```

## What you will see

The browser tab names the account this would publish to and asks you to allow
it. **That screen is the whole of the authority** — the registration this
command performs first grants nothing by itself. Allow it and the key appears
on the agents page like any other, revocable from there.

If no browser opens, copy the printed URL into one yourself. The callback runs
on a loopback port (`http://127.0.0.1:<port>/callback`), which is the shape the
server permits for native clients.

## What it does, in order

1. Resolves the plane **from the key this machine already holds** — never from
   configuration beside it. A staging key connects to staging; a production key
   connects to production. Guessing is how an artifact lands on the wrong plane.
2. Reads RFC 8414 metadata, so the consent and token endpoints come from the
   server rather than from this script.
3. Registers a public client (RFC 7591) with the loopback redirect.
4. Opens the consent screen with PKCE S256 — the only method the server
   accepts, because `plain` lets whoever intercepts the redirect redeem it.
5. Exchanges the code and stores the key.

## Reconnect

Run `/connect` again on an already-connected machine. The new key replaces
the old one in the same file; the previous one keeps working until you revoke
it from the agents page. If you mean to rotate, revoke first.

## If it fails

Run `/doctor` afterwards — it connects to everything rather than reading
configuration, which is the difference between "the file exists" and "the key
works". A refusal at the consent screen means what it says: the person who
controls the account did not allow this client, and nothing was stored.

**Never print the key.** Quote the fingerprint the doctor prints if you need to
say which key is in play.