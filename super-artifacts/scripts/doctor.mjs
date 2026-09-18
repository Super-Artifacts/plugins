#!/usr/bin/env node
/**
 * `/doctor` — can this machine record and publish a walkthrough?
 *
 * Convention #17's rule, applied to a new surface: **verify by connecting,
 * never by reading the config.** A key that is present in the environment and
 * revoked on the plane looks exactly like a working setup to anything that only
 * checks whether the variable is set, and the first thing that notices is the
 * publish at the end of a five-minute recording.
 *
 * So every check here does the thing rather than describing it. The plane check
 * spends a real request. The browser check records a real video — which is the
 * only way to learn that the browser launches *and* that the capture pipeline
 * behind it works, and it is cheaper than either failure discovered later.
 *
 * Exit code is the verdict: 0 when everything required answered, 1 otherwise.
 * `doctor-checks.mjs` owns that decision and is unit tested; this file owns the
 * touching of things and is not.
 */

import { execFile } from 'node:child_process'

import { mkdtemp, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { ADVISORY, fail, pass, report, verdict } from './lib/doctor-checks.mjs'
import { resolveFfmpeg, resolveKey } from './lib/host.mjs'
import { keyFingerprint, planeFor } from './lib/plane.mjs'
import { projectImporter, projectRoots } from './lib/project.mjs'
import { loadPlaywright } from './lib/resolve-playwright.mjs'

const run = promisify(execFile)

const arg = (name) => {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function checkPlane(findings, key, plane) {
  if (!plane.ok) {
    findings.push(fail('plane', 'cannot be resolved from the key', plane.message))
    return
  }

  let response
  try {
    response = await fetch(`${plane.api}/whoami`, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    })
  } catch (error) {
    findings.push(
      fail(
        'plane',
        `${plane.api} did not answer (${error.message})`,
        'Check the network. If you are offline, recording still works — only publishing needs the plane.',
      ),
    )
    return
  }

  if (response.status === 401 || response.status === 403) {
    findings.push(
      fail(
        'plane',
        `${plane.environment} rejected this key (${response.status})`,
        'The key is revoked or belongs to another plane. Pair again from https://superartifacts.app/agents.',
      ),
    )
    return
  }
  if (!response.ok) {
    findings.push(
      fail(
        'plane',
        `${plane.api} answered ${response.status}`,
        'The serving plane is unhealthy. Try again; if it persists this is not your setup.',
      ),
    )
    return
  }

  const who = await response.json().catch(() => ({}))
  findings.push(pass('plane', `${plane.environment} · ${who.handle ?? 'signed in'}`))
}

/**
 * Launch a browser and record a real video with it.
 *
 * Two checks in one deliberately. A browser that launches but cannot capture is
 * a state the plugin has no other way to discover, and discovering it here costs
 * a second — against a five-minute recording that produces a zero-byte file.
 */
async function checkBrowser(findings) {
  const cwd = process.cwd()
  const loaded = await loadPlaywright({
    cwd,
    pluginRoot: new URL('..', import.meta.url).pathname,
    extraRoots: projectRoots(cwd),
    importer: projectImporter,
  })

  if (!loaded.ok) {
    findings.push(fail('browser', 'playwright is not installed', loaded.message, ADVISORY))
    return
  }
  const { chromium } = loaded

  const dir = await mkdtemp(join(tmpdir(), 'sa-doctor-'))
  try {
    const browser = await chromium.launch()
    const context = await browser.newContext({
      recordVideo: { dir, size: { width: 640, height: 360 } },
    })
    const page = await context.newPage()
    await page.setContent('<h1>doctor</h1>')
    await page.waitForTimeout(400)
    await context.close()
    await browser.close()

    const files = await readdir(dir)
    const video = files.find((name) => name.endsWith('.webm'))
    if (video === undefined) {
      findings.push(
        fail(
          'browser',
          'chromium launched but recorded no video',
          'Reinstall the browser: npx playwright install chromium',
          ADVISORY,
        ),
      )
      return
    }
    const { size } = await stat(join(dir, video))
    if (size === 0) {
      findings.push(
        fail(
          'browser',
          'the recording came out empty',
          'npx playwright install chromium',
          ADVISORY,
        ),
      )
      return
    }
    findings.push(pass('browser', `chromium records (${size} bytes in a 0.4s probe)`))
  } catch (error) {
    findings.push(
      fail(
        'browser',
        `chromium would not launch (${error.message.split('\n')[0]})`,
        'npx playwright install chromium',
        ADVISORY,
      ),
    )
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

async function main() {
  const findings = []

  const major = Number(process.versions.node.split('.')[0])
  if (major >= 20) {
    findings.push(pass('node', `v${process.versions.node}`))
  } else {
    findings.push(
      fail('node', `v${process.versions.node}`, 'Node 20 or newer is required. Upgrade node.'),
    )
  }

  const { key, from } = resolveKey()
  const plane = planeFor(key, { apiOrigin: arg('api') })
  if (key === '') {
    findings.push(
      fail(
        'key',
        'not set',
        'Pair this agent from https://superartifacts.app/agents, then export SUPER_ARTIFACTS_KEY.',
      ),
    )
  } else {
    // Convention #7: a transcript is a log, and a key never goes into one.
    findings.push(pass('key', `${keyFingerprint(key)} from ${from}`))
  }

  if (key !== '') await checkPlane(findings, key, plane)
  else findings.push(fail('plane', 'not checked — no key to check it with', 'Set a key first.'))

  await checkBrowser(findings)

  const ffmpeg = await resolveFfmpeg()
  if (ffmpeg === null) {
    findings.push(
      fail(
        'ffmpeg',
        'not found',
        'brew install ffmpeg (macOS) or apt-get install -y ffmpeg (Linux).',
        ADVISORY,
      ),
    )
  } else if (!ffmpeg.capable) {
    /**
     * The finding this check exists for. Playwright ships an ffmpeg, so "is
     * there an ffmpeg" answers yes on almost every machine that has Playwright
     * — and that build has no libx264 and no mp4 muxer, so the encode dies
     * later on `Unrecognized option 'preset'`. Saying it here, in terms of what
     * the binary cannot do, is the difference between a two-word fix and an
     * afternoon.
     */
    findings.push(
      fail(
        'ffmpeg',
        `${ffmpeg.source} cannot encode h264/mp4`,
        'That ffmpeg is capture-only. Install a full one — brew install ffmpeg, or apt-get install -y ffmpeg — or set FFMPEG_PATH to one.',
        ADVISORY,
      ),
    )
  } else {
    findings.push(pass('ffmpeg', `${ffmpeg.encoder} via ${ffmpeg.source}`))
  }

  try {
    const { stdout } = await run('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
    findings.push(pass('git', `on ${stdout.trim()}`, ADVISORY))
  } catch {
    findings.push(
      fail(
        'git',
        'not a git repository',
        'Run this inside a repo — the recorder scopes itself to a diff.',
        ADVISORY,
      ),
    )
  }

  const result = verdict(findings)
  console.log('super-artifacts doctor\n')
  console.log(report(findings))
  console.log(`\nrecorder: ${result.recorder}`)
  console.log(result.ok ? '\nReady.' : '\nNot ready — see the fixes above.')

  if (process.argv.includes('--json')) {
    console.log(`\n${JSON.stringify({ findings, ...result }, null, 2)}`)
  }
  process.exit(result.exitCode)
}

await main()
