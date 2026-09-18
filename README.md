<p align="center">
  <h1 align="center">super artifacts</h1>
  <p align="center">
    <em>An agent builds it. Somebody opens it.</em>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/works%20with-Claude%20Code-111111?style=flat-square" alt="Works with Claude Code">
    <img src="https://img.shields.io/badge/install-two%20lines-111111?style=flat-square" alt="Two-line install">
    <img src="https://img.shields.io/badge/auto--updates-yes-111111?style=flat-square" alt="Auto-updates">
  </p>
</p>

---

Your agent built something — a tracker, a survey, a walkthrough of your codebase. It lives in a folder on your machine. This plugin gives it somewhere to go: **a live URL, in seconds, that a reviewer opens on their phone.**

Connect Claude Code to your Super Artifacts account over OAuth, record narrated video walkthroughs of what you changed, and publish them as live URLs with a comment box under each beat that writes into a hosted database.

**Pairing never builds anything.** The plugin connects; it does not spend your inference tokens until you invoke a command. `/init` builds the first artifact (a walkthrough of your codebase plus a machine diagnosis) because you ran it — not because you connected.

## Before / after

You ask your agent for proof that the change works. It says "all tests pass" and you get a 40-file diff.

With the plugin:

```text
/proof
```

One short video per key change, chaptered, at a URL that plays inline on a phone — captions burned in, each beat seekable, and a comment box that writes into a hosted database so a reviewer can reply to the thing on screen.

## Install

Connecting is MCP-first now: every CLI harness connects through its own MCP
configuration over OAuth (`claude mcp add --transport http super-artifacts
https://api.superart.page/mcp`), and the plugin adds the recorder and slash
commands on top. The plugin itself still installs from the marketplace:

```
/plugin marketplace add Super-Artifacts/plugins
```
```
/plugin install super-artifacts@super-artifacts
```

(You have to send two separate prompts for the install to work.)

Updates install themselves — a git-hosted marketplace auto-updates in the background, so there is nothing to run after the first install.

## Commands

| Command | What it does |
|---------|--------------|
| `/connect` | Connect over OAuth — consent screen in the browser, key stored locally (mode 600) |
| `/disconnect` | Revoke this machine's key on the plane, then remove the local copy |
| `/init` | Getting-started artifact tailored to your CLI tool |
| `/doctor` | Can this machine record and publish? Verifies by connecting, never by reading config |
| `/proof` | Record this session's change and publish it |
| `/proof-demo` | Prove the whole chain works, against a bundled page |

Your own `/proof`-style command works too: any command that drives the plugin's `record.mjs` and `publish.mjs` targets the same backend the built-ins do.

## Pairing

Connect once, then pair from [superartifacts.app/agents](https://superartifacts.app/agents):

- Your browser opens a consent page that **names the account it would publish to**. Allow it only if that is yours.
- The key is stored locally, never printed, and revocable from the agents page.
- Pairing from staging (`stg.superartifacts.app/agents`) mints a `sa_stg_` key that publishes to staging; pairing from production mints `sa_live_`. The plugin derives which plane to talk to **from the key's prefix** — never from configuration — so one install serves both, and a key can never quietly publish to the wrong plane.

## What it needs

`/doctor` answers this by connecting to everything rather than by reading configuration — a revoked key looks exactly like a working one until something spends a request on it.

| | Why | Without it |
| --- | --- | --- |
| A key | publishing | nothing publishes |
| Playwright + chromium | real screen capture | falls back to the slideshow tier |
| A full ffmpeg | h264/mp4, which is what a phone plays | falls back to the slideshow tier |

**Playwright's bundled ffmpeg is not enough** — it has no libx264 and no mp4 muxer. Install a real one (`brew install ffmpeg`, `apt-get install -y ffmpeg`) or set `FFMPEG_PATH`.

When there is no browser to drive, the same tour becomes an auto-advancing captioned deck. It is published as `kind: slideshow`, it says on the page that it is not a recording, and the command tells you before recording rather than after you open the link.

## How it works

```
/connect      → OAuth (PKCE S256, loopback redirect) → key in ~/.config/super-artifacts/key
/proof        → tour spec → chromium capture → captions burned in → h264 → publish over MCP
                → live URL on superart.page, private by default
```

The recorder has two tiers: **browser** (a tour spec drives chromium, each key change becomes its own mp4 with seekable chapter marks) and **slideshow** (the same spec as a captioned deck when there is no browser). Publishing goes over MCP's `super_publish` with a `files` array — the narrow path, taken on purpose so it gets exercised on every run.

Artifacts are private until you make them openable — that is a decision you take on the artifact's own page, not a URL that gets forwarded.

## This repo is a mirror

The plugin's source lives in the private [`Super-Artifacts/superartifacts`](https://github.com/Super-Artifacts/superartifacts) repo — that is where its tests run. This repo is synced from it on every merge that touches the plugin, and its marketplace manifest is generated there. **Do not commit here directly**; the next sync overwrites it. Issues and PRs belong on the main repo.

## License

The plugin's source is proprietary to the Super Artifacts team; this mirror is public so the marketplace install works. See [superartifacts.app](https://superartifacts.app) for the product.