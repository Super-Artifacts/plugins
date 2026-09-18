---
description: Check whether this machine can record and publish a walkthrough — key, plane, browser, transcoder — by connecting to each rather than reading config.
argument-hint: "[--api <origin>]"
---

# /doctor

Run this **before** the first recording on a machine, and any time a publish
fails in a way that reads like a credential problem.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs" $ARGUMENTS
```

## Why it connects instead of checking config

A key that is present in the environment and revoked on the plane looks exactly
like a working setup to anything that only checks whether the variable is set.
The first thing that notices is the publish, at the end of a five-minute
recording — which is the most expensive possible moment to learn it.

So every check here spends something: a real request to `/whoami`, a real
browser launch that records a real (0.4 second) video. Report what it printed;
do not summarise it as "environment looks fine".

## Reading the output

The last two lines are the ones that matter.

- **`recorder: browser`** — real screen capture is available. This is what
  `/proof` should produce.
- **`recorder: slideshow`** — no browser, or no transcoder. `/proof` will
  still work and will produce a narrated deck instead. **Say so to the person
  before recording**, and offer the two-minute install
  (`npm i -D playwright && npx playwright install chromium`) — a slideshow they
  chose is fine, a slideshow they were surprised by is not.

A failure marked `(advisory)` narrows what the plugin can do without stopping
it. A failure that is not advisory means publishing cannot work at all, and the
fix is printed underneath.

## When it says the key is missing

The key comes from `SUPER_ARTIFACTS_KEY`, or from
`~/.config/super-artifacts/key`. If there is neither, the person needs to pair
this agent once, at <https://superartifacts.app/agents> — that hands over a
line to paste, and the agent introduces itself and receives a key.

**Never print the key**, in the transcript or anywhere else. The doctor prints a
fingerprint (`sa_stg_…3f9a`) for exactly this reason, and that is what to quote
if you need to identify which key is in play.
