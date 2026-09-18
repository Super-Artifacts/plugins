---
description: Record a narrated walkthrough of what changed in this session and publish it as a live URL a reviewer can open on a phone.
argument-hint: "[of the <feature>] [--pr <n>] [--slug <name>]"
---

# /proof

A reviewer opening a 40-file diff gets *what changed* and none of *why*. This
builds the missing half: one short video per key change, chaptered, at a URL that
plays inline on a phone — and a comment box under each beat that writes into a
database, so a reviewer can reply to the thing on screen.

**You are recording your own work.** You know which beat matters and can say
why; that is the whole reason this is a command you run rather than a job that
watches the repo.

## 1. Check the machine, once

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs"
```

Read the `recorder:` line. `browser` means real capture; `slideshow` means the
fallback, and **you must tell the person that before you record**, not after
they open the link.

## 2. Decide whether there is anything to watch

Look at the diff — `git diff --stat origin/main...HEAD` and then the hunks that
matter.

**"Nothing watchable" is a successful outcome, not a problem to route around.**
Tests, documentation, CI configuration, migrations, lockfiles, formatting and
repo tooling get no walkthrough. If that is what this change is, say so in one
sentence naming which of those it was, and stop. A confident video about the
wrong thing costs the reviewer the minutes before they work out it is wrong,
which is worse than no video at all.

## 3. Split it into key changes

**One key change per thing a reviewer should know about — not one per commit.**
Two unrelated fixes are two changes, so a reviewer can open the one that is
theirs. One fix explained in three beats is one change with three captions.

Each change becomes a card in a scrolling strip and its own mp4. Each caption
becomes a seekable chapter under the player.

Keep a change to one beat. Thirty seconds is good; if it needs three minutes it
is two changes.

## 4. Write the tour spec

Write JSON to a temporary file — not into the repo, this is not a committed
artefact:

```json
{
  "baseUrl": "http://localhost:3000",
  "viewport": { "width": 1280, "height": 720 },
  "changes": [
    {
      "title": "Sign-out names its destination",
      "steps": [
        { "goto": "/login" },
        { "fill": "#email", "value": "someone@example.com" },
        { "click": "text=Continue" },
        { "say": "Signing out used to land wherever the provider chose." },
        { "click": "text=Sign out", "say": "Now it names where the session ends, so a shared machine is actually signed out." }
      ]
    }
  ]
}
```

Steps: `goto`, `say`, `click`, `fill` (+`value`), `press`, `wait` (ms),
`highlight`, `scrollTo`, `showAddress`. Anything else is refused by name.

The rules that make a watchable recording, all learned the hard way:

- **Reach the starting state before the first `say`.** Sign in, navigate, seed —
  none of it narrated. Everything before the first caption is trimmed off the
  front, so setup costs the reviewer nothing and narrating it costs them
  everything.
- **A change stands alone.** It gets a fresh browser context and cannot assume
  another ran.
- **Narrate why, not what.** The video already shows what. "Signing out puts the
  gallery back behind the login wall" earns its place; "clicking the sign out
  button" does not.
- **`say` goes on the step it describes**, and fires after the action — so the
  thing being explained is already on screen.
- **Highlight what matters** rather than hoping it is noticed.
- **`showAddress` when the URL is the point.** Playwright records the viewport,
  so the address bar is otherwise simply absent.

**The app has to be running and reachable at `baseUrl`.** Start it first, and
seed whatever the tour needs. Never point a tour at data somebody else depends
on, and never have it publish over a fixture another check asserts against.

## 5. Record

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/record.mjs" --spec /tmp/tour.json --out /tmp/proof
```

If the doctor said `slideshow`, use the fallback instead — same spec:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/slideshow.mjs" --spec /tmp/tour.json --out /tmp/proof --title "..."
```

A warning that a change "cannot fit at a watchable bitrate" means that change is
too long. **Split it into two**; do not re-encode it smaller.

## 6. Publish

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/publish.mjs" --in /tmp/proof --pr <n> --title "..." --subtitle "..."
```

Use `--slug <name>` instead of `--pr <n>` when there is no pull request. Putting
an invented number in the URL is a lie in the one place nobody re-reads.

**Publishing the same pull request again reuses the slug**, so it lands as a new
version and the link already in the PR body keeps showing the newest cut. Never
publish a second slug for one pull request — that is two links a reviewer has to
choose between, and the older one is a trap.

## 7. Hand it over

Give the person the URL on its own line, then one line on what is on it. Put the
deep links the publisher printed into the pull request body — `#<changeId>` per
key change — so the list is clickable rather than decorative.

Then confirm it actually opens:

```bash
curl -sI "$URL" | head -1                        # 200, unauthenticated
curl -sI -r 0-1023 "$URL/change-0.mp4" | head -1 # 206 — seeking works
```

That second one is not ceremony: iOS Safari will not play a video at all from a
server that does not answer a range request, and it is the check that catches it.
