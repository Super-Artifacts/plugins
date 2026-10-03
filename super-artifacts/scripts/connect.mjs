#!/usr/bin/env node
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
/**
 * `node connect.mjs [--api <origin>]` — OAuth connect from inside the plugin.
 *
 * Discovers the platform's authorization server from the plane the *key* names
 * (never from configuration beside it — see lib/plane.mjs), registers a public
 * client over RFC 7591, opens a browser at the consent screen with PKCE S256,
 * and writes the key the token endpoint returns to the same file the doctor
 * reads. The consent screen is where the authority lives: the person sees which
 * account this would publish to and approves or refuses there.
 *
 * The touchable half. The pure parts it leans on — plane resolution, the
 * redirect rules the server enforces — live beside it and are unit tested.
 */
import { createServer } from 'node:http'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { detectClient } from './lib/client.mjs'
import { planeFor } from './lib/plane.mjs'

// No stdlib opener: hand the URL to the platform's own. Failure is not fatal —
// the URL is printed above, so the person can paste it themselves.
function openBrowser(url) {
  const [command, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]]
  spawn(command, args, { stdio: 'ignore', detached: true })
    .on('error', () => {})
    .unref()
}

const USAGE = 'usage: node connect.mjs [--api <origin>]'

function argOrigin(argv) {
  const index = argv.indexOf('--api')
  if (index === -1) return null
  const value = argv[index + 1]
  if (value === undefined) {
    console.error(`${USAGE}\n--api needs an origin, e.g. https://api-stg.superart.page`)
    process.exit(1)
  }
  return value
}

/** A pairing line already in the environment answers "which plane" for free. */
async function keyPlane(apiOverride) {
  const key = process.env.SUPER_ARTIFACTS_KEY ?? (await readStoredKey().catch(() => null))
  const plane = planeFor(key, { apiOrigin: apiOverride ?? undefined })
  if (!plane.ok) {
    console.error(plane.message)
    process.exit(1)
  }
  return plane
}

function storedKeyPath() {
  return join(homedir(), '.config', 'super-artifacts', 'key')
}

async function readStoredKey() {
  return (await readFile(storedKeyPath(), 'utf8')).trim()
}

async function writeStoredKey(key) {
  const file = storedKeyPath()
  await mkdir(join(file, '..'), { recursive: true })
  await writeFile(file, `${key}\n`, { mode: 0o600 })
}

/** A loopback port the callback server can have; 0 means "pick one for me". */
async function listen(port = 0) {
  return new Promise((resolve) => {
    const server = createServer()
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

const b64url = (buffer) => Buffer.from(buffer).toString('base64url')

async function main() {
  const apiOverride = argOrigin(process.argv.slice(2))
  const plane = await keyPlane(apiOverride)
  if (plane === null) {
    console.error(
      "No plane to connect to. Hold a key first (pair once), or pass --api with the plane's origin.",
    )
    process.exit(1)
  }

  console.log(`Connecting to the ${plane.environment} plane at ${plane.platform}`)

  // RFC 8414 discovery, so the endpoints this flow needs are read from the
  // server rather than assumed from this script. A consent screen that moves
  // is then a server change, not a plugin release.
  const metadataResponse = await fetch(`${plane.platform}/.well-known/oauth-authorization-server`)
  if (!metadataResponse.ok) {
    console.error(
      `The plane's authorization-server metadata did not answer (${metadataResponse.status}). ` +
        'Run /doctor for the fuller diagnosis.',
    )
    process.exit(1)
  }
  const metadata = await metadataResponse.json()
  const { authorization_endpoint, token_endpoint, registration_endpoint } = metadata
  if (
    typeof authorization_endpoint !== 'string' ||
    typeof token_endpoint !== 'string' ||
    typeof registration_endpoint !== 'string'
  ) {
    console.error("The plane's metadata is missing an endpoint this flow needs. Run /doctor.")
    process.exit(1)
  }

  // RFC 7591 dynamic registration. It grants nothing; the consent screen does.
  const callbackServer = await listen()
  const { port } = callbackServer.address()
  const redirectUri = `http://127.0.0.1:${port}/callback`

  const client = detectClient()
  const registerResponse = await fetch(registration_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: `Super Artifacts (${client.name})`,
      redirect_uris: [redirectUri],
    }),
  })
  if (!registerResponse.ok) {
    const body = await registerResponse.text().catch(() => '')
    console.error(`Client registration was refused (${registerResponse.status}). ${body}`)
    process.exit(1)
  }
  const { client_id } = await registerResponse.json()
  if (typeof client_id !== 'string' || client_id.length === 0) {
    console.error('The registration did not return a client_id.')
    process.exit(1)
  }

  // PKCE S256, the only method the server accepts.
  const verifier = b64url(crypto.randomBytes(32))
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest())

  const authorizeUrl = new URL(authorization_endpoint)
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('client_id', client_id)
  authorizeUrl.searchParams.set('redirect_uri', redirectUri)
  authorizeUrl.searchParams.set('scope', 'artifacts:write')
  authorizeUrl.searchParams.set('state', b64url(crypto.randomBytes(16)))
  authorizeUrl.searchParams.set('code_challenge', challenge)
  authorizeUrl.searchParams.set('code_challenge_method', 'S256')

  const code = await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Timed out waiting for the consent screen.')),
      300_000,
    )
    callbackServer.on('request', (request, response) => {
      const url = new URL(request.url, `http://127.0.0.1:${port}`)
      response.writeHead(200, { 'content-type': 'text/plain' })
      response.end('You can close this tab — return to the terminal to see the result.')
      clearTimeout(timeout)
      resolve(url.searchParams.get('code'))
    })
    console.log(`\nOpening the consent screen:\n  ${authorizeUrl.toString()}\n`)
    openBrowser(authorizeUrl.toString())
  })

  if (code === null) {
    console.error('The consent screen did not hand back a code. Nothing was connected.')
    process.exit(1)
  }

  const tokenResponse = await fetch(token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id,
      code_verifier: verifier,
    }),
  })
  if (!tokenResponse.ok) {
    const body = await tokenResponse.json().catch(() => ({}))
    console.error(
      `The token exchange failed (${tokenResponse.status}). ${body.error ?? ''} ${body.error_description ?? ''}`.trim(),
    )
    process.exit(1)
  }
  const { access_token: key } = await tokenResponse.json()
  if (typeof key !== 'string' || key.length === 0) {
    console.error('The token endpoint did not return an access token.')
    process.exit(1)
  }

  await writeStoredKey(key)
  console.log(
    `Connected. The key is stored at ${storedKeyPath()} (mode 600). It is revoked from the agents page, never on a clock.`,
  )
  console.log(
    `Slash commands are already installed; run /init when you want a getting-started artifact for ${client.name}.`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
