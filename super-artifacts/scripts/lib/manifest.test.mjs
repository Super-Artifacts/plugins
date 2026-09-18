import { describe, expect, it } from 'vitest'
import { buildManifest, buildTranscript, changeId, injectManifest, timecode } from './manifest.mjs'

const RENDERER = [
  '<!doctype html><html><body>',
  '<script id="manifest" type="application/json">',
  '{"version":1,"changes":[]}',
  '</script>',
  '<script>boot()</script>',
  '</body></html>',
].join('\n')

describe('timecode', () => {
  it('floors rather than rounds, so a mark never displays later than it seeks', () => {
    expect(timecode(0)).toBe('0:00')
    expect(timecode(9.9)).toBe('0:09')
    expect(timecode(61)).toBe('1:01')
    expect(timecode(600)).toBe('10:00')
  })

  it('treats nonsense as the start rather than printing NaN into the page', () => {
    expect(timecode(undefined)).toBe('0:00')
    expect(timecode(-5)).toBe('0:00')
  })
})

describe('changeId', () => {
  it('derives a stable hash from the title, not the position', () => {
    // The point of the whole scheme: inserting a change before this one must
    // not move the link already in a pull request body.
    expect(changeId('Sign-out named no destination', 3)).toBe('sign-out-named-no-destination')
  })

  it('falls back to the index when a title reduces to nothing', () => {
    expect(changeId('—', 2)).toBe('change-2')
    expect(changeId('', 0)).toBe('change-0')
  })

  it('disambiguates rather than letting two cards answer to one hash', () => {
    const taken = new Set(['fix-the-thing'])
    expect(changeId('Fix the thing', 1, taken)).toBe('fix-the-thing-2')
  })
})

describe('buildManifest', () => {
  const recorded = {
    changes: [
      {
        title: 'Sign-out named no destination',
        file: 'change-0.mp4',
        durationSeconds: 41.2,
        chapters: [
          { title: 'What went wrong', startSeconds: 0 },
          { title: 'Why the redirect matters', startSeconds: 18.6 },
        ],
      },
    ],
  }

  it('marks each chapter with a readable timecode beside its seek offset', () => {
    const manifest = buildManifest(recorded, { pr: 42 })
    const [change] = manifest.changes

    expect(change.id).toBe('sign-out-named-no-destination')
    expect(change.chapters[1]).toEqual({
      title: 'Why the redirect matters',
      startSeconds: 18.6,
      mark: '0:18',
    })
  })

  it('titles itself from the pull request when no title is given', () => {
    expect(buildManifest(recorded, { pr: 42 }).title).toBe('PR #42')
    expect(buildManifest(recorded, {}).title).toBe('Walkthrough')
  })

  it('keeps files bundle-relative so the same manifest works on any host', () => {
    const [change] = buildManifest(recorded, {}).changes
    expect(change.file).toBe('change-0.mp4')
    expect(change.file).not.toMatch(/^https?:/)
  })

  it('survives a recording with no changes rather than throwing', () => {
    expect(buildManifest({}, {}).changes).toEqual([])
  })
})

describe('injectManifest', () => {
  it('replaces the block and leaves the rest of the renderer alone', () => {
    const out = injectManifest(RENDERER, { version: 1, changes: [] })
    expect(out).toContain('<script>boot()</script>')
    expect(out.match(/<script id="manifest"/g)).toHaveLength(1)
    const json = /type="application\/json">\s*([\s\S]*?)\s*<\/script>/.exec(out)?.[1]
    expect(JSON.parse(json)).toEqual({ version: 1, changes: [] })
  })

  /**
   * The failure this function exists to prevent, and the one with no symptom:
   * the deploy succeeds, the URL resolves, and the page is blank.
   */
  it('escapes a closing script tag inside the data instead of ending the element', () => {
    const out = injectManifest(RENDERER, {
      changes: [{ title: 'the </script> bug' }],
    })

    // One real closing tag for this element — the one that was already there.
    const body = out.slice(out.indexOf('<script id="manifest"'))
    const firstClose = body.indexOf('</script>')
    expect(body.slice(0, firstClose)).not.toContain('</script>')
    // And it still round-trips as JSON.
    const json = /type="application\/json">\s*([\s\S]*?)\s*<\/script>/.exec(out)?.[1]
    expect(JSON.parse(json).changes[0].title).toBe('the </script> bug')
  })

  it('refuses a page that is not the template, by name', () => {
    expect(() => injectManifest('<html></html>', {})).toThrow(/pr-video-overview/)
  })

  it('refuses a manifest block that is never closed', () => {
    expect(() => injectManifest('<script id="manifest" type="application/json">{}', {})).toThrow(
      /never closed/,
    )
  })
})

describe('buildTranscript', () => {
  it('writes the marks as text, for the reader who will not watch anything', () => {
    const manifest = buildManifest(
      {
        changes: [
          {
            title: 'One',
            file: 'change-0.mp4',
            chapters: [{ title: 'Opening', startSeconds: 0 }],
          },
        ],
      },
      { title: 'PR #7', subtitle: 'two fixes' },
    )

    const text = buildTranscript(manifest)
    expect(text).toContain('# PR #7')
    expect(text).toContain('two fixes')
    expect(text).toContain('## One')
    expect(text).toContain('- **0:00** Opening')
  })
})
