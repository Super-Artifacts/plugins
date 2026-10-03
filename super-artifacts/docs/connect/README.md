# Connect guides

One page per harness, in the order install → connect → verify (`/doctor` where it
exists) → first artifact.

These pages are generated from `apps/platform/src/lib/agent-guides.ts` — the
same source the dashboard's agent directory renders — so a change made here and
a change made there are one change. When you add or update a harness, edit
`AGENT_GUIDES` first; the dashboard and these pages follow.