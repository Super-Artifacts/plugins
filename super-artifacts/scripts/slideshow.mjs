#!/usr/bin/env node
/**
 * R3 — build the fallback deck from the same tour spec the recorder would drive.
 *
 * Writes `index.html` and a `manifest.json` marked `tier: "slideshow"`, which is
 * what tells `publish.mjs` to publish a `slideshow` rather than a `video`. One
 * output directory, one publisher, two tiers — so the tier is a property of what
 * was produced rather than a flag somebody has to remember to pass twice.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { buildSlideshow } from './lib/slideshow.mjs'
import { validateSpec } from './lib/tour-spec.mjs'

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : process.argv[index + 1]
}

const die = (message) => {
  console.error(message)
  process.exit(1)
}

const specPath = arg('spec')
if (specPath === undefined) die('usage: slideshow.mjs --spec <tour.json> [--out <dir>]')

const outDir = resolve(arg('out', 'sa-proof'))
const title = arg('title')
const subtitle = arg('subtitle')

let spec
try {
  spec = JSON.parse(await readFile(resolve(specPath), 'utf8'))
} catch (error) {
  die(`could not read ${specPath}: ${error.message}`)
}

/**
 * The spec is validated by the same rules the recorder uses, even though half of
 * them are about driving a page this tier will never open.
 *
 * That is deliberate: the fallback is meant to be the *same tour*, degraded —
 * so a spec that works here and not there would mean the agent had written two
 * tours and only tested the weaker one.
 */
const { ok, problems } = validateSpec(spec)
if (!ok) die(`the tour spec is not valid:\n${problems.map((p) => `  - ${p}`).join('\n')}`)

let html
try {
  html = buildSlideshow(spec, { title, subtitle })
} catch (error) {
  die(error.message)
}

await mkdir(outDir, { recursive: true })
await writeFile(join(outDir, 'index.html'), html)
await writeFile(
  join(outDir, 'manifest.json'),
  `${JSON.stringify({ tier: 'slideshow', title, subtitle, changes: [] }, null, 2)}\n`,
)

console.log(`slideshow → ${join(outDir, 'index.html')}`)
console.log('This is the fallback tier. If a browser is available, `record.mjs` makes a real one.')
