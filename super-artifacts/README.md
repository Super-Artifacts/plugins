<p align="center">
  <h1 align="center">super-artifacts</h1>
  <p align="center">
    <em>Turn what your agent just built into a live URL a reviewer can open on a phone.</em>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/works%20with-Claude%20Code-111111?style=flat-square" alt="Works with Claude Code">
    <img src="https://img.shields.io/badge/install-two%20lines-111111?style=flat-square" alt="Two-line install">
    <img src="https://img.shields.io/badge/connect-OAuth%20or%20API%20key-111111?style=flat-square" alt="Connects over OAuth or an API key">
    <img src="https://img.shields.io/badge/auto--updates-yes-111111?style=flat-square" alt="Auto-updates">
  </p>
</p>

---

Your agent built something — a tracker, a survey, a walkthrough of your codebase. It lives in a folder on your machine. This plugin gives it somewhere to go: **a live URL, in seconds, that a reviewer opens on their phone.**

## Install

**Any harness that speaks MCP** — Claude Code, Codex, Cursor, Copilot, Gemini
CLI, Zed, Windsurf, Devin, and the hosted chat agents — connects through the
harness's own MCP configuration, one URL, over OAuth. One page per harness
lives in [`docs/connect/`](docs/connect/), generated from the same source the
dashboard's agent directory reads. Claude Code, for example:

```
claude mcp add --transport http super-artifacts https://api.superart.page/mcp
```

The harness offers a Connect or Sign in button; the consent screen names the
account the key would publish to.

**Claude Code as a plugin** (the recorder and slash commands) is still
installable from the public marketplace:

```
/plugin marketplace add Super-Artifacts/plugins
/plugin install super-artifacts@super-artifacts
```

(Two separate prompts — Claude Code does not chain them.) Updates install
themselves: a git-hosted marketplace auto-updates in the background, so there is
nothing to run after the first install. The plugin is the recorder tier, not the
credential tier — connect through MCP either way.

## Connect

The credential travels the way every other developer tool moves one — no custom
handshake, no expiring code:

| Harness | How it stores the key |
| --- | --- |
| Any MCP connector | The harness's own Connect/Sign-in button opens the consent screen and holds the key |
| The plugin's `/connect` | A browser consent screen, key stored locally (mode 600), revocable from the dashboard |
| Everything else | Copy a key from the [API keys page](https://superartifacts.app/api-keys), set `SUPER_ARTIFACTS_KEY` in the agent's environment |

## Verify, then use

```
/doctor         can this machine record and publish?
/init           getting-started artifact tailored to your CLI tool
/proof          record this session's change and publish it
/proof-demo     prove the whole chain works, against a bundled page
/disconnect     revoke this machine's key on the plane, then remove the local copy
```

`/doctor` verifies by connecting rather than by reading configuration, which is the whole reason it exists: a revoked key looks exactly like a working one until something spends a request on it.

Your own `/proof`-style command works too: any command that drives `scripts/record.mjs` and `scripts/publish.mjs` targets the same backend the built-ins do.

## What it needs

| | Why | Without it |
| --- | --- | --- |
| A key | publishing | nothing publishes |
| Playwright + chromium | real screen capture | falls back to the slideshow tier |
| A full ffmpeg | h264/mp4, which is what a phone plays | falls back to the slideshow tier |

**Playwright's bundled ffmpeg is not enough.** It is built `--disable-everything` for Playwright's own webm capture and has no libx264 and no mp4 muxer at all — an encode with it dies on `Unrecognized option 'preset'`, which reads like a broken command line rather than the wrong binary. Install a real one (`brew install ffmpeg`, `apt-get install -y ffmpeg`) or set `FFMPEG_PATH`.

## The two tiers

**`browser`** — the real thing. A tour spec drives chromium, captions are burned into the frame, each key change becomes its own mp4 with seekable chapter marks.

**`slideshow`** — the fallback, when there is no browser to drive. The same tour spec becomes an auto-advancing captioned deck. It is published as `kind: slideshow`, it says on the page that it is not a recording, and the command tells the person before recording rather than after they open the link. A fallback that hides being a fallback is how somebody follows the documentation exactly and is surprised that no video appeared.

## Layout

```
.claude-plugin/plugin.json   the manifest
commands/                    slash commands (connect, disconnect, doctor, init, proof, proof-demo)
assets/                      the demo page and its tour
scripts/
  doctor.mjs                 connects to everything and reports
  record.mjs                 R1 — drives a browser, writes mp4s + manifest.json
  publish.mjs                uploads over MCP, then opens the artifact
  connect.mjs                OAuth connect — discovery, registration, PKCE, loopback callback
  disconnect.mjs             plane-first revoke, then the file
  lib/                       the pure parts, and the only tested ones
```

`lib/` holds everything that can be decided without touching the world — bitrate arithmetic, manifest shape and injection, spec validation, plane resolution, the doctor's verdict. Those have tests. The entry points do the touching and do not.

## Publishing goes over MCP on purpose

`publish.mjs` calls `super_publish` with a `files` array rather than posting to `/deploy`, even though `/deploy` has taken multi-file bundles for longer and would work.

That is deliberate. `/deploy` being sufficient is exactly what hid the gap this plugin was built around: an agent with a shell could always work around a publish tool that could not carry a file, so nobody noticed the tool could not carry a file — and every connector-only agent (Claude Desktop, ChatGPT) was quietly unable to publish a video at all. Taking the narrow path means the narrow path gets exercised on every run.

One step is still not MCP: making the artifact readable. `super_publish` has no `visibility` argument, so `publish.mjs` sends an HTTP `PATCH`, which a creator key is authorised for on its own artifact. A connector-only agent has no way to send it, and can therefore publish a review video that nobody can open. That is the same shape of gap `files` just closed, one argument along.

## The player is fetched, not bundled

`super_get_template` returns the reviewed `pr-video-overview` renderer, and publishing fills one `<script id="manifest">` block in it. There is no copy of that HTML in this plugin, because a copy is a second source of truth for a file whose entire job is to be the one source.

## Developing the plugin itself

A checkout of `superartifacts` works as its own marketplace — the repo root's `.claude-plugin/marketplace.json` names this plugin — which is the documented developer flow:

```
/plugin marketplace add /path/to/superartifacts
/plugin install super-artifacts@super-artifacts
```

The public repo (`Super-Artifacts/plugins`) is synced from this private one on every release, so a local checkout can run ahead of what the marketplace serves.