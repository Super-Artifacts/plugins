# Super Artifacts: one more step

A portable `mcp.json` cannot declare OAuth, so sign in once. Type these three
lines in a terminal, one at a time (if you use a Hermes profile, start every
line with that profile's command instead of `hermes`):

```
hermes config set mcp_servers.super-artifacts '{"url":"https://superartifacts.app/mcp","auth":"oauth","oauth":{"flow":"device"},"enabled":false}'
hermes mcp login super-artifacts
hermes config set mcp_servers.super-artifacts.enabled true
```

1. Tell Hermes about the server. It is saved switched off, so the plugin's unsigned copy stops trying and failing.
2. Sign in. It prints an address and a code (`Code: XXXX-XXXX`): open the address on any device, type the code, press **Allow** on the page that names your account, and wait for `Authenticated`. Press Allow only if that account is yours. The code lasts five minutes; this works over SSH, no browser has to open on this machine.
3. Switch it on. The tools connect within a minute with the new key. No restart and no `/reload-mcp`: ask in your open chat or a new one.

If the tools still are not there, run the same three lines again; it is safe to repeat.

Revoke the key at any time from https://superartifacts.app/agents, or remove it
from this machine with `hermes mcp remove super-artifacts` (the package's own
unsigned copy can reappear; run the three lines again to connect).
