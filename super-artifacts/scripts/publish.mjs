#!/usr/bin/env node
/**
 * Publish a recording as a live artifact.
 *
 * Deliberately over MCP — `POST {api}/mcp`, JSON-RPC, `super_publish` — and not
 * over the `/deploy` HTTP endpoint, even though `/deploy` is what this repo's
 * own `scripts/pr-video/publish.mjs` uses and has taken multi-file bundles since
 * WP1.
 *
 * The reason is that `/deploy` being sufficient *here* is exactly what hid the
 * gap: an agent with a shell has always been able to work around a publish tool
 * that could not carry a file, so nobody noticed that the tool could not carry a
 * file, and every connector-only agent was quietly unable to publish a video at
 * all. Making the plugin take the narrow path means the narrow path is exercised
 * on every run, by the people most likely to notice when it breaks.
 *
 * The player is **fetched, not bundled.** `super_templates {slug}` returns
 * `spec.renderer` — the reviewed `fixtures/pr-video-overview/index.html` — so a
 * plugin release cannot drift from the template the platform is actually
 * serving. A local copy would be a second source of truth for a file whose whole
 * job is to be the one source.
 */

import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { resolveKey } from './lib/host.mjs'
import { buildManifest, buildTranscript, injectManifest } from './lib/manifest.mjs'
import { keyFingerprint, planeFor } from './lib/plane.mjs'

const TEMPLATE_SLUG = 'pr-video-overview'
const TEMPLATE_VERSION = 3

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : process.argv[index + 1]
}

const die = (message) => {
  console.error(message)
  process.exit(1)
}

let nextId = 1

/** One JSON-RPC call against the plane's MCP endpoint. */
async function callTool(plane, key, name, args) {
  const response = await fetch(`${plane.api}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: nextId++,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  })

  const body = await response.json().catch(() => ({}))
  if (body.error !== undefined) {
    throw new Error(`${name}: ${body.error.message ?? 'the plane returned a protocol error'}`)
  }

  const text = body.result?.content?.[0]?.text ?? ''
  // A tool failure arrives as a *result* with isError, not as a JSON-RPC error,
  // precisely so the text is readable. Surfacing that text is the whole point.
  if (body.result?.isError === true) throw new Error(`${name}: ${text}`)
  // Every listed tool answers with one envelope, as `structuredContent` and as
  // the same JSON in the text.
  if (body.result?.structuredContent !== undefined) return body.result.structuredContent
  try {
    return JSON.parse(text)
  } catch {
    // A plane that has not deployed the envelope answers super_publish in prose,
    // the URL on its own line. Read that too until every plane has it.
    const url = text
      .split('\n')
      .find((line) => /^https?:\/\//.test(line.trim()))
      ?.trim()
    const id = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/.exec(text)?.[1]
    const version = /version (\d+)/i.exec(text)?.[1]
    if (name === 'super_publish' && url !== undefined && id !== undefined) {
      return { url, id, version: version === undefined ? undefined : Number(version) }
    }
    die(`${name} did not answer with its JSON envelope. The plane said:\n${text.slice(0, 400)}`)
  }
}

async function main() {
  const inDir = resolve(arg('in', 'sa-proof'))
  const pr = arg('pr')
  const explicitSlug = arg('slug')
  const title = arg('title')
  const subtitle = arg('subtitle')

  if (pr === undefined && explicitSlug === undefined) {
    die('usage: publish.mjs --in <dir> (--pr <number> | --slug <name>) [--title "..."]')
  }

  // `--slug` has no number by definition. Inventing a PR number puts a lie in
  // the URL, so the two modes stay separate rather than one defaulting to the
  // other.
  const slug = explicitSlug ?? `pr-video-${pr}`
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    die(`--slug must be lowercase kebab-case; got "${slug}"`)
  }

  const { key, from } = resolveKey()
  const plane = planeFor(key, { apiOrigin: arg('api') })
  if (!plane.ok) die(plane.message)

  let recorded
  try {
    recorded = JSON.parse(await readFile(join(inDir, 'manifest.json'), 'utf8'))
  } catch (error) {
    die(`could not read ${join(inDir, 'manifest.json')} — record first.\n${error.message}`)
  }

  const changes = Array.isArray(recorded.changes) ? recorded.changes : []
  const tier = recorded.tier === 'slideshow' ? 'slideshow' : 'browser'

  if (tier === 'browser' && changes.length === 0) {
    die('the recording produced no changes, so there is nothing to publish.')
  }

  console.log(`publishing ${slug} to ${plane.environment} as ${keyFingerprint(key)} (from ${from})`)

  /**
   * The fallback tier publishes a different thing and says so.
   *
   * `kind: 'slideshow'`, no template, no files — because it is not a recording
   * and filing it as a `video` built from `pr-video-overview` would put a wrong
   * answer into the one place that is supposed to record what an artifact
   * actually is. The gallery, the template counts and `super_get_responses` all
   * read that field.
   */
  if (tier === 'slideshow') {
    const html = await readFile(join(inDir, 'index.html'), 'utf8')
    const published = await callTool(plane, key, 'super_publish', {
      slug,
      html,
      prompt: recorded.title ?? title ?? 'Walkthrough',
      kind: 'slideshow',
      collection: 'reviews',
    })
    console.log(`\npublished ${published.slug} v${published.version}\n${published.url}`)
    console.log(
      '\nThis is the slideshow tier — no browser was available to record. Install Playwright and re-run for a real screen capture.',
    )
    return
  }

  // 1. The player, from the registry rather than from a copy that could drift.
  const read = await callTool(plane, key, 'super_templates', { slug: TEMPLATE_SLUG })
  const template = read.template ?? read

  const renderer = template?.spec?.renderer?.html ?? template?.spec?.renderer
  if (typeof renderer !== 'string' || renderer === '') {
    die(
      `the ${TEMPLATE_SLUG} template carries no renderer, so there is no player to fill. This is a platform-side problem, not a local one.`,
    )
  }

  // 2. Fill it. `injectManifest` is the tested half — a botched injection
  //    publishes a blank page with no error anywhere.
  const manifest = buildManifest(recorded, {
    pr: pr === undefined ? undefined : Number(pr),
    title,
    subtitle,
    comments: true,
  })
  const html = injectManifest(renderer, manifest)

  // 3. The recordings, as base64 beside the page.
  const files = []
  for (const change of manifest.changes) {
    const bytes = await readFile(join(inDir, change.file))
    files.push({
      path: change.file,
      content: bytes.toString('base64'),
      contentType: 'video/mp4',
      // Sent so a corrupted upload is refused rather than served: a truncated
      // mp4 plays as nothing and looks exactly like a recording that failed.
      sha256: createHash('sha256').update(bytes).digest('hex'),
    })
  }

  const totalMiB = files.reduce((sum, f) => sum + f.content.length * 0.75, 0) / 1024 / 1024
  console.log(`  ${files.length} recording(s), ~${totalMiB.toFixed(2)} MiB`)

  const published = await callTool(plane, key, 'super_publish', {
    slug,
    html,
    prompt: manifest.title,
    kind: 'video',
    collection: 'reviews',
    template: { slug: TEMPLATE_SLUG, version: TEMPLATE_VERSION },
    policy: template?.spec?.declaration ?? undefined,
    files,
  })

  await writeFile(join(inDir, 'transcript.md'), buildTranscript(manifest))
  const { url, id } = published
  console.log(`\npublished ${published.slug} v${published.version}\n${url}`)

  /**
   * Open it, because a review video behind a sign-in is a review video nobody
   * watches — convention #11, and the reason this repo's own publisher does the
   * same thing. Through `super_artifact_set`, so a connector-only agent can do
   * exactly what this script does.
   */
  if (id !== undefined && !process.argv.includes('--keep-private')) {
    try {
      await callTool(plane, key, 'super_artifact_set', { artifact: id, visibility: 'public' })
      console.log('opened to anyone with the link.')
    } catch (error) {
      console.warn(
        `could NOT open it (${error.message}). It is published but private, so a reviewer will hit a sign-in screen. Open it from its page in the dashboard.`,
      )
    }
  }

  if (url !== undefined) {
    console.log('\nDeep-link a beat:')
    for (const change of manifest.changes) {
      console.log(`  ${url}#${change.id}   ${change.title}`)
    }
  }
}

await main()
