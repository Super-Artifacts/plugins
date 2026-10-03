/**
 * The two decisions worth testing about a published walkthrough: what the
 * manifest says, and how it gets into the player.
 *
 * This is a portable restatement of `scripts/lib/pr-video-manifest.mjs`, and the
 * duplication is deliberate rather than an oversight. That module is imported by
 * this repo's own pipeline through a relative path into `scripts/`; a plugin
 * installed on somebody else's machine has no `scripts/` above it, so a shared
 * import would resolve to nothing the first time anybody used the thing this
 * plugin exists to give them. The contract they both implement — the shape the
 * `pr-video-overview` renderer reads out of `<script id="manifest">` — is owned
 * by the template row, not by either copy.
 *
 * `injectManifest` is the half that fails silently when it is wrong. A
 * replacement that closes the script element early produces a blank artifact
 * with no error anywhere: the deploy succeeds, the URL works, and the page is
 * empty. That is why the escaping below is a rule rather than a convenience, and
 * why it has a test of its own.
 */

/** The marker the renderer reads. Both halves must match the template exactly. */
const OPEN = '<script id="manifest" type="application/json">'
const CLOSE = '</script>'

/**
 * Seconds → `M:SS`, which is what the player prints beside a chapter.
 *
 * Floors rather than rounds: a mark that displays one second *later* than it
 * seeks looks like the player is broken, while one that displays a second early
 * is invisible.
 */
export function timecode(seconds) {
  const whole = Math.max(0, Math.floor(Number(seconds) || 0))
  const minutes = Math.floor(whole / 60)
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`
}

/**
 * A slug-safe id for a key change, used as the URL hash that deep-links it.
 *
 * Derived from the title rather than the index, because the whole point of
 * `#<changeId>` is that a link in a pull request body keeps pointing at the same
 * beat after the tour is re-recorded with another change inserted before it.
 * Collisions fall back to the index, which is worse than a stable name and much
 * better than two cards answering to one hash.
 */
export function changeId(title, index, taken = new Set()) {
  const base =
    String(title ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || `change-${index}`

  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

/**
 * Build the manifest the renderer consumes.
 *
 * `changes[].file` is a bundle-relative name, never a URL: the player resolves
 * it against its own location, which is what lets the same manifest work on a
 * preview host, on staging and in production without being rewritten.
 */
export function buildManifest(recorded, { title, subtitle, pr, comments = false } = {}) {
  const taken = new Set()
  const changes = (recorded?.changes ?? []).map((change, index) => {
    const id = changeId(change.title ?? change.id, index, taken)
    taken.add(id)

    const chapters = (change.chapters ?? []).map((chapter) => ({
      title: String(chapter.title ?? '').trim(),
      startSeconds: Math.max(0, Number(chapter.startSeconds) || 0),
      mark: timecode(chapter.startSeconds),
    }))

    return {
      id,
      title: String(change.title ?? `Change ${index + 1}`).trim(),
      file: String(change.file),
      durationSeconds: Math.max(0, Number(change.durationSeconds) || 0),
      chapters,
    }
  })

  return {
    version: 1,
    title: title ?? (pr === undefined ? 'Walkthrough' : `PR #${pr}`),
    ...(subtitle === undefined ? {} : { subtitle }),
    ...(pr === undefined ? {} : { pr }),
    comments: Boolean(comments),
    changes,
  }
}

/**
 * Put the manifest into the renderer, replacing whatever block is there.
 *
 * `</script>` inside JSON string data ends the element as far as an HTML parser
 * is concerned — it does not care that it is inside quotes. A chapter titled
 * "the `</script>` bug" would therefore truncate the page at that character and
 * publish a blank artifact. `<\/` is valid JSON escaping and inert to the
 * parser, so it is applied unconditionally rather than when a title looks
 * suspicious.
 */
export function injectManifest(renderer, manifest) {
  const start = renderer.indexOf(OPEN)
  if (start === -1) {
    throw new Error(
      `the renderer has no ${OPEN} block — it is not a pr-video-overview template, or the template changed its marker.`,
    )
  }
  const from = start + OPEN.length
  const end = renderer.indexOf(CLOSE, from)
  if (end === -1) {
    throw new Error('the renderer’s manifest block is never closed.')
  }

  const json = JSON.stringify(manifest, null, 2).replace(/<\//g, '<\\/')
  return `${renderer.slice(0, from)}\n${json}\n${renderer.slice(end)}`
}

/**
 * The transcript, which is the artefact that survives having no sound.
 *
 * Searchable, diffable in review, and readable by somebody who will not watch a
 * video at all — which is a larger group than the pipeline's name suggests.
 */
export function buildTranscript(manifest) {
  const lines = [`# ${manifest.title}`, '']
  if (manifest.subtitle) lines.push(manifest.subtitle, '')

  for (const change of manifest.changes) {
    lines.push(`## ${change.title}`, '')
    for (const chapter of change.chapters) {
      lines.push(`- **${chapter.mark}** ${chapter.title}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}
