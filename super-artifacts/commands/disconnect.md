---
description: Disconnect this machine's Super Artifacts key — revoke it on the plane, then remove the local copy. The order is the plane first, because that is what authorises.
---

# /disconnect

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/disconnect.mjs" $ARGUMENTS
```

## What it does, in order, and why the order is load-bearing

1. **Reads the stored key** from `~/.config/super-artifacts/key`.
2. **Asks the plane.** A key that no longer answers there is already dead — the
   revocation that matters happened somewhere else — so the stale file is
   deleted and the command stops there.
3. **Revokes on the plane where it can, deletes the file either way.** A
   creator key is not allowed to revoke its neighbour, so a key holder cannot
   always finish the revocation itself. When the plane refuses, the output says
   so plainly and names the dashboard button that finishes the job — it does
   not report "disconnected" when the plane still holds the key.

## What it does not touch

Agents other than this one, artifacts already published, and anything else on
the account. This is a per-machine, per-key disconnect — the roster on the
agents page is where an account's whole credential surface is revoked at once.

## Reading the output

- **"revoked on the plane and removed from this machine"** — done, in both
  stores, in the order the platform's own revoke uses.
- **"the plane still holds it"** — the local half finished; the dashboard
  button is the other half. Say this to the person rather than summarising it
  as "disconnected", because a key the person believes is revoked and isn't is
  the state this command exists to prevent.
- **"no longer answers on this plane"** — nothing was connected. The stale
  copy is gone; no action remains.