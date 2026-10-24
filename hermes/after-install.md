# Super Artifacts: one more step

A portable `mcp.json` cannot declare OAuth, so tell Hermes once that this
server signs in with it:

```
hermes mcp add super-artifacts --url https://superartifacts.app/mcp --auth oauth --connect-timeout 300
```

A Super Artifacts page opens in your browser and names the account the agent
would publish to. Press **Allow** only if that account is yours. Connecting
publishes nothing. Then send `/reload-mcp` in an open chat, or start a new one.

Over SSH, or on Linux with no display, the command prints an address instead:
open it on any device, press Allow, and paste the address your browser lands on
back into the prompt. To
sign in again later with a short code instead:

```
hermes mcp login super-artifacts --flow device
```

Revoke the key at any time from https://superartifacts.app/agents, or remove
it from this machine with `hermes mcp remove super-artifacts`.
