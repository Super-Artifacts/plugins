/**
 * The two things every command has to find on the machine it is running on: the
 * key, and a transcoder.
 *
 * They live here rather than in `doctor.mjs` because `doctor.mjs` runs its own
 * `main()` at module scope — importing it to borrow a helper would run the
 * doctor and call `process.exit`, which is a spectacular way for `record.mjs` to
 * fail. An entry point is not a library, and the moment a second caller wants
 * something out of one, the something moves here.
 */

import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

/** Every place a key may live, and the label to report it under. */
export const KEY_FILE = join(homedir(), '.config', 'super-artifacts', 'key')

/**
 * Where a key comes from, in the order the plugin trusts them.
 *
 * The environment wins, because that is what CI and a direnv user both set. The
 * file is the fallback, so somebody who paired once does not have to keep a
 * secret in a shell profile.
 */
export function resolveKey({ env = process.env, exists = existsSync, read = readFileSync } = {}) {
  const fromEnv = env.SUPER_ARTIFACTS_KEY
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') {
    return { key: fromEnv.trim(), from: 'SUPER_ARTIFACTS_KEY' }
  }
  if (exists(KEY_FILE)) {
    const contents = String(read(KEY_FILE, 'utf8')).trim()
    if (contents !== '') return { key: contents, from: '~/.config/super-artifacts/key' }
  }
  return { key: '', from: 'nowhere' }
}

/**
 * Playwright's bundled ffmpeg, if there is one.
 *
 * Kept separate from {@link resolveFfmpeg} because it is **not** a transcoder.
 * It is built `--disable-everything` with exactly what Playwright's own capture
 * needs — libvpx, the webm muxer, matroska demuxing, `scale`/`pad`/`crop` — and
 * has no libx264 and no mp4 muxer. Useful to *find*, so the doctor can say "the
 * only ffmpeg here cannot make an mp4" instead of "no ffmpeg"; useless to
 * encode with.
 */
export async function playwrightFfmpeg({ env = process.env } = {}) {
  const roots = [
    env.PLAYWRIGHT_BROWSERS_PATH,
    join(homedir(), 'Library', 'Caches', 'ms-playwright'),
    join(homedir(), '.cache', 'ms-playwright'),
    join(homedir(), 'AppData', 'Local', 'ms-playwright'),
  ].filter((value) => typeof value === 'string' && value !== '')

  for (const root of roots) {
    let entries
    try {
      entries = await readdir(root)
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!entry.startsWith('ffmpeg-')) continue
      for (const name of ['ffmpeg-mac', 'ffmpeg-linux', 'ffmpeg-win64.exe', 'ffmpeg']) {
        const candidate = join(root, entry, name)
        if (existsSync(candidate)) return candidate
      }
    }
  }
  return null
}

/** Ask a binary what it can do. Empty strings when it will not answer at all. */
export async function ffmpegCapabilities(binary) {
  const ask = async (flag) => {
    try {
      const { stdout } = await run(binary, ['-hide_banner', flag], { maxBuffer: 8 * 1024 * 1024 })
      return stdout
    } catch {
      return ''
    }
  }
  return { encoders: await ask('-encoders'), muxers: await ask('-muxers') }
}

/**
 * An ffmpeg that can actually produce the file the player needs.
 *
 * **This asks what the binary can do rather than that it exists**, and the
 * distinction is the whole function. The first version of this preferred
 * Playwright's bundled ffmpeg on the grounds that it removed a system
 * dependency — which is true and irrelevant, because that build has no libx264
 * and no mp4 muxer. Every encode died on `Unrecognized option 'preset'`: a
 * message about an argument, from a binary that could never have done the job.
 *
 * `FFMPEG_PATH` first (an operator overriding on purpose), then PATH, then
 * Playwright's — and the last one will fail the capability probe, which is the
 * point. It is returned as `capable: false` so the caller can say something true
 * about *why* rather than reporting nothing found.
 */
export async function resolveFfmpeg({ env = process.env } = {}) {
  const candidates = []

  if (typeof env.FFMPEG_PATH === 'string' && env.FFMPEG_PATH !== '') {
    candidates.push({ path: env.FFMPEG_PATH, source: 'FFMPEG_PATH' })
  }
  try {
    const { stdout } = await run('which', ['ffmpeg'])
    const path = stdout.trim()
    if (path !== '') candidates.push({ path, source: 'PATH' })
  } catch {
    /* nothing on PATH; the bundled one may still be found below */
  }
  const bundled = await playwrightFfmpeg({ env })
  if (bundled !== null) candidates.push({ path: bundled, source: 'playwright (capture-only)' })

  const { canEncodeH264, encoderNameFor } = await import('./encode.mjs')

  let firstFound = null
  for (const candidate of candidates) {
    const caps = await ffmpegCapabilities(candidate.path)
    if (firstFound === null) firstFound = { ...candidate, capable: false, encoder: null }
    if (canEncodeH264(caps.encoders, caps.muxers)) {
      return { ...candidate, capable: true, encoder: encoderNameFor(caps.encoders) }
    }
  }
  return firstFound
}
