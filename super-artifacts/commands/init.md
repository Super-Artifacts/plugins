---
description: Create a getting-started artifact showing what Super Artifacts can do from this CLI tool — ideas, examples, and a live URL to prove the pipeline works.
argument-hint: "[--publish]"
---

# /init

The first thing after `/connect`. It builds a **getting-started artifact** —
a live page with ideas for using Super Artifacts from the CLI tool you are
running in — and optionally publishes it as proof the pipeline works end to end.

## 1. Check the connection

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs"
```

Read the `recorder:` line. If it says `no key`, tell the person to run `/connect`
first. Report the tier (`browser` or `slideshow`) — the getting-started page will
mention what this machine can do.

## 2. Detect the CLI tool

```bash
node -e "import('./lib/client.mjs').then(m => console.log(JSON.stringify(m.detectClient())))"
```

Run this from `${CLAUDE_PLUGIN_ROOT}/scripts/`. The `id` and `name` tell you
which CLI tool the person is using. Tailor the artifact's content and examples
to that tool.

## 3. Fetch the getting-started template

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/publish.mjs" --help 2>&1 || true
```

The template comes from the platform via `super_get_template`. Fetch the
`getting-started` template if available, fall back to building a standalone page
if it does not exist yet:

```javascript
// inside publish.mjs the template is fetched as:
// callTool(plane, key, 'super_get_template', { slug: 'getting-started' })
```

## 4. Build the getting-started page

Three files (`index.html`, `styles.css`, `app.js`), no build step, legible at
375 px. The page has three sections:

1. **What Super Artifacts does.** One sentence: turn what your agent built into
   a live URL a reviewer opens on a phone.

2. **Ideas for this CLI tool.** Five concrete things the person can do, specific
   to the detected tool. Examples by tool:

   - **Claude Code:** record a narrated walkthrough of a PR with `/proof`,
     publish a codebase overview, share a design exploration, create a visual
     bug report, build an interactive dashboard from data.
   - **Cursor:** publish a component preview, share a refactoring walkthrough,
     create a visual changelog, publish an architecture diagram, share a
     debugging session.
   - **OpenCode / Pi / Oh my Pi:** publish a project scaffold overview, share a
     migration walkthrough, create an API documentation artifact, publish test
     results as a visual report, share a deployment checklist.
   - **Generic (unknown tool):** all of the above, phrased generically.

   Each idea is one card with a title and a sentence. Not documentation — a
   spark.

3. **What just happened.** A short explanation: this page was built by the
   plugin, from inside your CLI tool, and published as a live URL. The pipeline
   works.

Include one animated SVG element — a simple proof-of-work showing the artifact
pipeline is live. Keep the same craft floor the platform's skill teaches.

Fetch the skill if this machine has never had it:

```bash
curl -sS https://stg.superartifacts.app/skill/SKILL.md
```

## 5. Publishing

Only with `--publish`, and only after the person has seen what the page says.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/publish.mjs" \
  --in /tmp/init \
  --slug "getting-started" \
  --title "Getting started with Super Artifacts"
```

The slug is `getting-started` — publishing again lands as a new version, so a
second `/init` updates rather than duplicates.

## What this is not

Not a substitute for `/proof` on a real change. `/init` proves the product
works and shows the person what they can do with it; `/proof` proves *their
change* works.
