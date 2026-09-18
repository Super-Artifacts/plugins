/**
 * Turning a browser recording into a file the serving plane will accept and a
 * phone will play.
 *
 * Two constraints shape every argument below, and both are learned rather than
 * chosen:
 *
 * - **5 MiB per file.** `workers/edge/src/limits.ts`. Convention #11 records the
 *   old concatenated walkthrough breaching it at two tours, at the end of a
 *   six-minute recording — which is the worst possible moment to find out. So
 *   the bitrate is computed from the duration *before* encoding rather than
 *   discovered afterwards, and the deploy is never the thing that reports a
 *   size problem.
 * - **iOS Safari.** `yuv420p` and `+faststart` are not stylistic: without the
 *   pixel format Safari plays audio-less black, and without faststart it will
 *   not begin until the whole file has arrived, which on a phone reads as a
 *   broken video.
 *
 * All pure. `record.mjs` spawns the binary; this decides what to spawn it with.
 */

/** `workers/edge/src/limits.ts` — the per-file cap this must stay under. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024

/**
 * Leave room for the container's own overhead and for the estimate being an
 * estimate. 12% is what the repo's own pipeline settled on; a tighter margin
 * produced files that were occasionally, unreproducibly, just over.
 */
const HEADROOM = 0.88

/** Below this, the video is unwatchable and the right answer is a shorter clip. */
export const MIN_KBPS = 200

/**
 * The video bitrate that lands a clip of this length under the cap.
 *
 * **`floored: true` is a refusal, not a fit.** When a clip is too long for the
 * budget, the returned `kbps` is the lowest *watchable* rate rather than the
 * rate that would satisfy the budget — because that rate is unwatchable, and
 * encoding at it produces a file that passes the cap and fails the reviewer,
 * which is the more expensive of the two failures.
 *
 * So a caller must branch on `floored` and must not read `kbps` as "this fits".
 * The fix for a floored clip is another key change, not another encode.
 */
export function targetKbps(durationSeconds, maxBytes = MAX_FILE_BYTES) {
  const seconds = Math.max(1, Number(durationSeconds) || 1)
  const bits = maxBytes * 8 * HEADROOM
  const ideal = Math.floor(bits / seconds / 1000)

  if (ideal < MIN_KBPS) {
    return {
      kbps: MIN_KBPS,
      floored: true,
      message: `A ${Math.round(seconds)}s clip cannot fit in ${maxBytes} bytes at a watchable bitrate. Split it into two key changes.`,
    }
  }
  // No point encoding a 40-second clip at 9 Mbps; the source is a screen
  // recording of mostly-static content and the extra bits buy nothing.
  return { kbps: Math.min(ideal, 2400), floored: false }
}

/**
 * The one encode: trim the un-narrated lead-in, normalise, fit the budget.
 *
 * `-ss` goes **before** `-i` deliberately. There it seeks by keyframe, which is
 * fast and accurate enough for cutting a lead-in; after `-i` it decodes and
 * discards every frame up to the mark, which on a long setup is slower than the
 * recording was.
 */
export function encodeArgs({
  input,
  output,
  trimSeconds = 0,
  kbps,
  width = 1280,
  height = 720,
  encoder = 'libx264',
}) {
  return [
    '-y',
    ...(trimSeconds > 0 ? ['-ss', trimSeconds.toFixed(3)] : []),
    '-i',
    input,
    '-vf',
    `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,fps=25`,
    '-c:v',
    encoder,
    // `-preset` is an libx264 option. VideoToolbox refuses it outright — with
    // `Unrecognized option 'preset'`, which reads like a broken command line
    // rather than the wrong encoder — so it is only sent to the encoder that
    // has it.
    ...(encoder === 'libx264' ? ['-preset', 'medium'] : []),
    '-b:v',
    `${kbps}k`,
    '-maxrate',
    `${kbps}k`,
    '-bufsize',
    `${kbps * 2}k`,
    // Safari plays neither without these.
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    // A screen recording has no audio track; saying so beats ffmpeg guessing.
    '-an',
    output,
  ]
}

/** Read a duration out of `ffprobe`-less ffmpeg stderr, which is where it is. */
export function parseDuration(stderr) {
  const match = /Duration:\s*(\d+):(\d+):(\d+\.?\d*)/.exec(String(stderr ?? ''))
  if (match === null) return null
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

/**
 * Can this ffmpeg actually produce the file the player needs?
 *
 * This exists because the obvious answer was wrong. Playwright ships an ffmpeg —
 * which is how `scripts/pr-video/finish.mjs` avoids a system dependency — and it
 * is built `--disable-everything` with just enough to do Playwright's own job:
 * libvpx, the webm muxer, the matroska demuxer, and `scale`/`pad`/`crop`. It has
 * **no libx264 and no mp4 muxer at all.**
 *
 * So "found an ffmpeg" is not the question. Handed Playwright's, an encode dies
 * on `Unrecognized option 'preset'` — a message about an argument, from a binary
 * that was never going to be able to do this, which is a long way from the
 * actual cause.
 *
 * mp4/h264 rather than webm because the target is a phone: Safari will not play
 * a webm, and the whole premise is a reviewer opening a link on one.
 */
export function canEncodeH264(encoders, muxers) {
  const hasEncoder = /\blibx264\b|\bh264_videotoolbox\b/.test(String(encoders ?? ''))
  const hasMuxer = /^\s*E\s+mp4\s/m.test(String(muxers ?? ''))
  return hasEncoder && hasMuxer
}

/** Which h264 encoder to ask for, given what the binary reports having. */
export function encoderNameFor(encoders) {
  const text = String(encoders ?? '')
  if (/\blibx264\b/.test(text)) return 'libx264'
  // Hardware fallback: present on macOS builds compiled without libx264, and
  // good enough for a screen recording.
  if (/\bh264_videotoolbox\b/.test(text)) return 'h264_videotoolbox'
  return null
}
