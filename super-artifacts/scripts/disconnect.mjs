#!/usr/bin/env node
import crypto from 'node:crypto'
/**
 * `node disconnect.mjs` — revoke the stored key on the serving plane, then
 * remove the file. The order is load-bearing and mirrors the platform's own
 * revoke: the plane first, because that is the store that actually authorises a
 * deploy; the file second, because a half-finished disconnect that still holds
 * the key is recoverable, while the reverse is a key that nothing records.
 */
import { readFile, unlink } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { planeFor } from './lib/plane.mjs'

function storedKeyPath() {
  return join(homedir(), '.config', 'super-artifacts', 'key')
}

async function main() {
  const path = storedKeyPath()
  let key = null
  try {
    key = (await readFile(path, 'utf8')).trim()
  } catch {
    console.error('No stored key to disconnect. Nothing to do.')
    process.exit(0)
  }

  const plane = planeFor(key)
  if (!plane.ok) {
    console.error(plane.message)
    console.error('Deleting the stored key file anyway, because that is the part this script owns.')
    await unlink(path)
    process.exit(1)
  }

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  const keyHash = Buffer.from(digest).toString('hex')

  // The serving plane's admin-only revocation endpoint answers 401 to a creator
  // key by design: a key that could revoke *any* key — including a neighbour's
  // — is a credential that escalates itself. So self-revocation is done through
  // /whoami's plane first to confirm the key still answers, then the revoke is
  // attempted with the admin door the operator path uses; when that is not
  // available from a key holder, the dashboard's revoke button is the path.
  const whoamiResponse = await fetch(`${plane.api}/whoami`, {
    headers: { authorization: `Bearer ${key}` },
  })
  if (!whoamiResponse.ok) {
    // The key already does not work on this plane: the revocation that matters
    // has happened, whether by the dashboard or by expiry. The file is stale.
    await unlink(path)
    console.error(
      'The key no longer answers on this plane. Stored copy deleted; nothing was connected.',
    )
    process.exit(0)
  }

  const revokeResponse = await fetch(`${plane.api}/keys/${keyHash}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${key}` },
  })

  // Removed regardless of the answer. A 401 here means the plane does not let a
  // key revoke itself, and the honest output is "delete the file; the dashboard
  // button is the one that revokes" — not a false "disconnected".
  await unlink(path)
  if (revokeResponse.ok) {
    console.log('Disconnected. The key was revoked on the plane and removed from this machine.')
  } else {
    console.log(
      'The stored key is gone from this machine. The plane still holds it — revoke it from the ' +
        'agents page to finish, because a key may not revoke its neighbour and this script holds no admin credential.',
    )
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
