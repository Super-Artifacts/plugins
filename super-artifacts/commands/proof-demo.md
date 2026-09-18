---
description: Record and publish a fifteen-second sample walkthrough against a bundled page, to prove the whole chain works on this machine before it matters.
argument-hint: "[--slug <name>]"
---

# /proof-demo

The first thing a person should see from this plugin is **their own working
video URL**, not a README.

This records a short walkthrough of a page the plugin ships with, publishes it,
and prints the link. It touches every part of the chain that a real run
touches — browser, capture, transcode, the `files` argument on `super_publish`,
the template fetch, the visibility flip — against content that cannot be wrong,
so a failure here is unambiguously about the machine rather than about the tour.

Run it once after installing. Run it again whenever a real recording fails in a
way you cannot place: if the demo works and the real tour does not, the problem
is the tour.

## Do it

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs" || true

node "${CLAUDE_PLUGIN_ROOT}/scripts/record.mjs" \
  --spec "${CLAUDE_PLUGIN_ROOT}/assets/demo-tour.json" \
  --base "file://${CLAUDE_PLUGIN_ROOT}/assets" \
  --out /tmp/proof-demo

node "${CLAUDE_PLUGIN_ROOT}/scripts/publish.mjs" \
  --in /tmp/proof-demo \
  --slug "${1:-proof-demo}" \
  --title "Super Artifacts — recorder check" \
  --subtitle "A sample walkthrough, recorded on this machine."
```

If the doctor reported `recorder: slideshow`, swap the middle command for the
fallback and expect a deck rather than a recording:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/slideshow.mjs" \
  --spec "${CLAUDE_PLUGIN_ROOT}/assets/demo-tour.json" \
  --base "file://${CLAUDE_PLUGIN_ROOT}/assets" \
  --out /tmp/proof-demo --title "Super Artifacts — recorder check"
```

## Then say what happened

Give the person the URL and one sentence: that it is a sample, that it proves
recording and publishing work on this machine, and that `/proof` does the same
thing for their actual change.

**The demo publishes to their real account**, so it appears in their gallery like
anything else. Say that too — an artifact nobody expected is worse than one they
were told about, and they may want to delete it afterwards.
