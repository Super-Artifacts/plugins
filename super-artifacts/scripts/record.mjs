#!/usr/bin/env node
/**
 * R1 — record a walkthrough by driving a real browser.
 *
 * Reads a tour spec (see `lib/tour-spec.mjs`), records one mp4 per key change,
 * and writes `manifest.json` beside them. That output is exactly what
 * `publish.mjs` consumes, and its shape is the `pr-video-overview` renderer's,
 * so nothing between here and the artifact has to reinterpret anything.
 *
 * Three rules from convention #11 are implemented here rather than documented:
 *
 * - **One change, one file.** Not one long video with markers: a marker inside
 *   one file still downloads the whole file, and the plane's per-file cap
 *   applies per file. The repo learned this by breaching the cap at two tours.
 * - **The lead-in is trimmed.** Recording starts before the first caption —
 *   sign-in, navigation, seeding — and every second of it is cut. A chapter that
 *   makes the reviewer watch its own setup has wasted the only attention it gets.
 * - **Each change gets a fresh context.** It cannot inherit state from the one
 *   before it, because when a real diff selects one change, none ran before it.
 *
 * Captions are burned in by injecting an overlay into the page under test, so
 * Playwright's recorder captures them with no compositing pass. That is the same
 * trade `docs/harness/README.md` argues: no TTS to pin, readable on mute, and
 * the text diffs in review.
 */

import { execFile } from 'node:child_process'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { encodeArgs, parseDuration, targetKbps } from './lib/encode.mjs'
import { resolveFfmpeg } from './lib/host.mjs'
import { projectImporter, projectRoots } from './lib/project.mjs'
import { loadPlaywright } from './lib/resolve-playwright.mjs'
import { readingTimeMs, validateSpec } from './lib/tour-spec.mjs'

const run = promisify(execFile)

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : process.argv[index + 1]
}

const die = (message) => {
  console.error(message)
  process.exit(1)
}

/**
 * The caption layer, injected into whatever page is on screen.
 *
 * **These are real functions, not strings.** `page.evaluate(someString, arg)`
 * evaluates the string as an *expression* and silently ignores the argument —
 * so a stringified `(text) => {…}` evaluates to a function object that is never
 * called, `evaluate` returns `undefined`, and the recording comes out with no
 * captions at all. Nothing errors. The first version of this file did exactly
 * that, and the symptom was a perfectly good 17-second video of a silent page.
 *
 * `position: fixed` and a very high z-index because the overlay has to survive
 * the application's own stacking. `pointer-events: none` because it must never
 * intercept a click the tour is about to make.
 */
const installOverlay = () => {
  if (document.getElementById('sa-caption')) return
  const el = document.createElement('div')
  el.id = 'sa-caption'
  el.style.cssText = [
    'position:fixed',
    'left:0',
    'right:0',
    'bottom:0',
    'z-index:2147483647',
    'pointer-events:none',
    'padding:20px 28px',
    'font:500 20px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif',
    'color:#fff',
    'background:linear-gradient(transparent,rgba(0,0,0,.82) 38%)',
    'text-shadow:0 1px 3px rgba(0,0,0,.9)',
    'opacity:0',
    'transition:opacity 180ms ease',
    'text-align:center',
  ].join(';')
  // `body`, not `documentElement`: a fixed child of <html> renders
  // inconsistently once a page sets its own stacking context.
  ;(document.body ?? document.documentElement).appendChild(el)
}

const setCaption = (text) => {
  const el = document.getElementById('sa-caption')
  if (!el) return false
  el.textContent = text
  el.style.opacity = text ? '1' : '0'
  return true
}

/** Draw the real URL into the frame — Playwright records the viewport only. */
const setAddress = (url) => {
  let bar = document.getElementById('sa-address')
  if (!bar) {
    bar = document.createElement('div')
    bar.id = 'sa-address'
    bar.style.cssText = [
      'position:fixed',
      'left:0',
      'right:0',
      'top:0',
      'z-index:2147483646',
      'pointer-events:none',
      'padding:8px 16px',
      'font:400 13px/1 ui-monospace,SFMono-Regular,Menlo,monospace',
      'color:#e8e8ea',
      'background:rgba(20,20,24,.94)',
      'border-bottom:1px solid rgba(255,255,255,.12)',
    ].join(';')
    ;(document.body ?? document.documentElement).appendChild(bar)
  }
  bar.textContent = url
}

async function performStep(page, step, state) {
  if (typeof step.goto === 'string') {
    // Any scheme, not only http(s): the bundled demo is recorded straight off
    // a file:// URL, so it needs no server to prove the chain works.
    const url = /^[a-z][a-z0-9+.-]*:/i.test(step.goto) ? step.goto : `${state.baseUrl}${step.goto}`
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.evaluate(installOverlay)
  }

  if (typeof step.showAddress === 'string' || step.showAddress === true) {
    await page.evaluate(installOverlay)
    await page.evaluate(
      setAddress,
      typeof step.showAddress === 'string' ? step.showAddress : page.url(),
    )
  }

  if (typeof step.highlight === 'string') {
    await page
      .locator(step.highlight)
      .first()
      .evaluate((el) => {
        el.style.outline = '3px solid #4f8cff'
        el.style.outlineOffset = '3px'
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      })
  }

  if (typeof step.scrollTo === 'string') {
    await page.locator(step.scrollTo).first().scrollIntoViewIfNeeded()
  }

  if (typeof step.click === 'string') {
    await page.locator(step.click).first().click()
  }

  if (typeof step.fill === 'string') {
    await page
      .locator(step.fill)
      .first()
      .fill(String(step.value ?? ''))
  }

  if (typeof step.press === 'string') {
    await page.keyboard.press(step.press)
  }

  if (typeof step.wait === 'number') {
    await page.waitForTimeout(step.wait)
  }

  // The caption goes last, so whatever the step did is already on screen behind
  // it. Narrating before acting shows the reviewer an explanation of something
  // that is not there yet.
  const caption = typeof step.say === 'string' ? step.say.trim() : ''
  if (caption !== '') {
    await page.evaluate(installOverlay)
    if (state.firstCaptionAt === null) state.firstCaptionAt = Date.now()

    const offset = (Date.now() - state.firstCaptionAt) / 1000
    state.chapters.push({ title: caption, startSeconds: Math.max(0, offset) })

    const shown = await page.evaluate(setCaption, caption)
    // An overlay that was not installed means a silent recording, and a silent
    // recording is indistinguishable from a good one until somebody watches it.
    if (shown !== true) throw new Error('the caption overlay was not installed on this page')
    await page.waitForTimeout(readingTimeMs(caption))
    await page.evaluate(setCaption, '')
    // A beat of clear frame, so two captions do not appear to be one.
    await page.waitForTimeout(180)
  }
}

async function recordChange({ chromium, change, index, spec, outDir, ffmpeg }) {
  const raw = join(outDir, `.raw-${index}`)
  await mkdir(raw, { recursive: true })

  const viewport = spec.viewport ?? { width: 1280, height: 720 }
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport,
    recordVideo: { dir: raw, size: viewport },
    ...(spec.storageState === undefined ? {} : { storageState: spec.storageState }),
  })

  const page = await context.newPage()
  const state = {
    baseUrl: (arg('base') ?? spec.baseUrl ?? '').replace(/\/$/, ''),
    startedAt: Date.now(),
    firstCaptionAt: null,
    chapters: [],
  }

  let failure = null
  try {
    await page.evaluate(installOverlay).catch(() => {})
    for (const step of change.steps) await performStep(page, step, state)
  } catch (error) {
    failure = error
  }

  const trimSeconds =
    state.firstCaptionAt === null ? 0 : (state.firstCaptionAt - state.startedAt) / 1000

  await context.close()
  await browser.close()

  if (failure !== null) {
    await rm(raw, { recursive: true, force: true })
    throw new Error(`"${change.title}" failed: ${failure.message.split('\n')[0]}`)
  }

  const files = await readdir(raw)
  const webm = files.find((name) => name.endsWith('.webm'))
  if (webm === undefined) throw new Error(`"${change.title}" produced no recording.`)

  const source = join(raw, webm)

  // Duration comes off ffmpeg's own probe of the file, not from the wall clock:
  // the two differ by however long the browser took to start, and the manifest's
  // durations are what the player's progress bar trusts.
  let measured = null
  try {
    await run(ffmpeg.path, ['-i', source])
  } catch (error) {
    measured = parseDuration(error.stderr)
  }
  const playable = Math.max(0.5, (measured ?? 0) - trimSeconds)

  const { kbps, floored, message } = targetKbps(playable)
  if (floored) console.warn(`  ! ${change.title}: ${message}`)

  const file = `change-${index}.mp4`
  await run(
    ffmpeg.path,
    encodeArgs({
      input: source,
      output: join(outDir, file),
      trimSeconds,
      kbps,
      encoder: ffmpeg.encoder,
    }),
  )
  await rm(raw, { recursive: true, force: true })

  const { size } = await stat(join(outDir, file))
  console.log(`  recorded ${file} — ${change.title} (${(size / 1024 / 1024).toFixed(2)} MiB)`)

  return {
    title: change.title,
    file,
    durationSeconds: playable,
    bytes: size,
    chapters: state.chapters,
  }
}

async function main() {
  const specPath = arg('spec')
  if (specPath === undefined) die('usage: record.mjs --spec <tour.json> [--out <dir>]')

  const outDir = resolve(arg('out', 'sa-proof'))
  let spec
  try {
    spec = JSON.parse(await readFile(resolve(specPath), 'utf8'))
  } catch (error) {
    die(`could not read ${specPath}: ${error.message}`)
  }

  const { ok, problems } = validateSpec(spec)
  if (!ok) die(`the tour spec is not valid:\n${problems.map((p) => `  - ${p}`).join('\n')}`)

  const cwd = process.cwd()
  const loaded = await loadPlaywright({
    cwd,
    pluginRoot: new URL('..', import.meta.url).pathname,
    extraRoots: projectRoots(cwd),
    importer: projectImporter,
  })
  if (!loaded.ok) die(loaded.message)

  const ffmpeg = await resolveFfmpeg()
  if (ffmpeg === null) {
    die(
      'No ffmpeg found. Install one: brew install ffmpeg (macOS), apt-get install -y ffmpeg (Linux).',
    )
  }
  if (!ffmpeg.capable) {
    // Naming the cause rather than letting the encode fail on an argument.
    die(
      `The only ffmpeg here (${ffmpeg.source}: ${ffmpeg.path}) cannot encode h264 or write mp4 — Playwright's bundled build is capture-only.\nInstall a full ffmpeg (brew install ffmpeg / apt-get install -y ffmpeg), or set FFMPEG_PATH.`,
    )
  }

  await mkdir(outDir, { recursive: true })

  const changes = []
  for (const [index, change] of spec.changes.entries()) {
    changes.push(
      await recordChange({ chromium: loaded.chromium, change, index, spec, outDir, ffmpeg }),
    )
  }

  const manifestPath = join(outDir, 'manifest.json')
  await writeFile(manifestPath, `${JSON.stringify({ changes }, null, 2)}\n`)

  console.log(`\n${changes.length} change${changes.length === 1 ? '' : 's'} → ${outDir}`)
  console.log(
    `Publish with:\n  node ${new URL('publish.mjs', import.meta.url).pathname} --in ${outDir} --slug <slug>`,
  )
}

await main()
