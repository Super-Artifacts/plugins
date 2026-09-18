import { describe, expect, it } from 'vitest'
import { encodeArgs, MAX_FILE_BYTES, MIN_KBPS, parseDuration, targetKbps } from './encode.mjs'

describe('targetKbps', () => {
  /**
   * Convention #5, applied to a limit that is not an HTTP status: the cap ships
   * with a test that trips it. Here "tripping" means proving the computed
   * bitrate actually lands under 5 MiB, not that some other layer refuses.
   */
  it('picks a bitrate that fits the cap, with headroom', () => {
    for (const seconds of [10, 30, 60, 120, 180]) {
      const { kbps } = targetKbps(seconds)
      const predictedBytes = (kbps * 1000 * seconds) / 8
      expect(predictedBytes).toBeLessThan(MAX_FILE_BYTES)
    }
  })

  it('does not waste bits on a short clip of a mostly-static screen', () => {
    // 10s could technically have ~3.6 Mbps; capped, because the source is a
    // screen recording and the extra bits buy nothing.
    expect(targetKbps(10).kbps).toBe(2400)
  })

  /**
   * The message that has to arrive *before* a six-minute recording, not after
   * the deploy refuses it — which is the failure convention #11 records.
   */
  it('refuses to pretend a long clip fits, and says what to do instead', () => {
    const result = targetKbps(60 * 10)
    expect(result.floored).toBe(true)
    expect(result.kbps).toBe(MIN_KBPS)
    expect(result.message).toMatch(/two key changes/)
  })

  it('does not divide by zero on a clip with no measured duration', () => {
    expect(targetKbps(0).kbps).toBeGreaterThan(0)
    expect(targetKbps(undefined).kbps).toBeGreaterThan(0)
  })

  it('honours a smaller budget when the clip can still fit inside it', () => {
    const { kbps, floored } = targetKbps(30, 2 * 1024 * 1024)
    expect(floored).toBe(false)
    expect((kbps * 1000 * 30) / 8).toBeLessThan(2 * 1024 * 1024)
  })

  /**
   * The floored bitrate is a **refusal, not a fit** — it is deliberately the
   * lowest watchable rate rather than whatever rate would satisfy the budget,
   * because that rate is unwatchable and encoding at it would produce a file
   * that passes the cap and fails the reviewer.
   *
   * So a caller must branch on `floored` and must not read `kbps` as "this
   * fits". Pinning it here because the number looks usable and is not.
   */
  it('returns a bitrate that does NOT fit when it floors, which is the signal to split', () => {
    const budget = 1024 * 1024
    const { kbps, floored, message } = targetKbps(60, budget)

    expect(floored).toBe(true)
    expect((kbps * 1000 * 60) / 8).toBeGreaterThan(budget)
    expect(message).toMatch(/cannot fit/)
  })
})

describe('encodeArgs', () => {
  const base = { input: 'in.webm', output: 'out.mp4', kbps: 1200 }

  /**
   * `-ss` before `-i` seeks by keyframe; after `-i` it decodes and throws away
   * every frame up to the mark, which on a long un-narrated setup takes longer
   * than the recording did.
   */
  it('puts the seek before the input so the trim is a seek, not a decode', () => {
    const args = encodeArgs({ ...base, trimSeconds: 4.2 })
    expect(args.indexOf('-ss')).toBeLessThan(args.indexOf('-i'))
    expect(args[args.indexOf('-ss') + 1]).toBe('4.200')
  })

  it('omits the seek entirely when there is no lead-in to cut', () => {
    expect(encodeArgs(base)).not.toContain('-ss')
  })

  /** Safari plays neither an odd pixel format nor a file it must download whole. */
  it('emits the two flags iOS Safari will not play without', () => {
    const args = encodeArgs(base)
    expect(args[args.indexOf('-pix_fmt') + 1]).toBe('yuv420p')
    expect(args[args.indexOf('-movflags') + 1]).toBe('+faststart')
  })

  it('caps the bitrate rather than only suggesting it', () => {
    const args = encodeArgs(base)
    expect(args[args.indexOf('-b:v') + 1]).toBe('1200k')
    expect(args[args.indexOf('-maxrate') + 1]).toBe('1200k')
  })

  it('pads rather than stretches, so a narrow viewport is not distorted', () => {
    const filter = encodeArgs(base)[encodeArgs(base).indexOf('-vf') + 1]
    expect(filter).toContain('force_original_aspect_ratio=decrease')
    expect(filter).toContain('pad=1280:720')
  })

  it('says there is no audio instead of letting ffmpeg guess', () => {
    expect(encodeArgs(base)).toContain('-an')
  })
})

describe('parseDuration', () => {
  it('reads the duration ffmpeg prints on stderr', () => {
    expect(parseDuration('  Duration: 00:01:23.45, start: 0.000')).toBeCloseTo(83.45, 2)
    expect(parseDuration('Duration: 01:00:00.00,')).toBe(3600)
  })

  it('returns null rather than NaN when there is nothing to read', () => {
    expect(parseDuration('')).toBeNull()
    expect(parseDuration(undefined)).toBeNull()
  })
})
