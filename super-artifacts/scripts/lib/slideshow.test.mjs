import { describe, expect, it } from 'vitest'
import { buildSlideshow, escapeHtml, slidesFrom } from './slideshow.mjs'

const spec = {
  changes: [
    {
      title: 'Sign-out names its destination',
      steps: [
        { goto: '/login' },
        { say: 'It used to land wherever WorkOS picked.' },
        { say: 'Now the destination is named.' },
      ],
    },
    { title: 'Second fix', steps: [{ say: 'And this one is unrelated.' }] },
  ],
}

describe('escapeHtml', () => {
  /**
   * The deck is built by concatenation, so an unescaped caption is a broken page
   * — the same class of silent failure as a botched manifest injection: the
   * deploy succeeds and the artifact is wrong.
   */
  it('neutralises markup a caption might contain', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(escapeHtml(`a "quoted" 'thing' & more`)).toBe(
      'a &quot;quoted&quot; &#39;thing&#39; &amp; more',
    )
  })

  it('renders nothing for nothing rather than the string undefined', () => {
    expect(escapeHtml(undefined)).toBe('')
  })
})

describe('slidesFrom', () => {
  it('makes one slide per caption and keeps which change it belongs to', () => {
    const slides = slidesFrom(spec)
    expect(slides).toHaveLength(3)
    expect(slides[0]).toMatchObject({ change: 'Sign-out names its destination', first: true })
    expect(slides[1].first).toBe(false)
    expect(slides[2].change).toBe('Second fix')
  })

  it('ignores steps that were only actions', () => {
    expect(slidesFrom(spec).every((slide) => slide.text !== '')).toBe(true)
  })

  it('returns nothing for an empty spec rather than throwing', () => {
    expect(slidesFrom({})).toEqual([])
    expect(slidesFrom(undefined)).toEqual([])
  })
})

describe('buildSlideshow', () => {
  it('refuses a spec with nothing to say instead of publishing a blank deck', () => {
    expect(() => buildSlideshow({ changes: [{ title: 'x', steps: [] }] })).toThrow(
      /nothing to show/,
    )
  })

  /**
   * The honesty rule. The skill this plugin replaces built exactly this and
   * called it a video overview, so somebody could follow the documentation
   * exactly and be surprised no video appeared.
   */
  it('says on the page that it is a slideshow and not a recording', () => {
    const html = buildSlideshow(spec, { title: 'PR #9' })
    expect(html).toMatch(/not a screen recording/i)
  })

  it('escapes captions on the way into the markup', () => {
    const html = buildSlideshow({
      changes: [{ title: '<b>t</b>', steps: [{ say: '<img onerror=x>' }] }],
    })
    expect(html).not.toContain('<img onerror=x>')
    expect(html).toContain('&lt;img onerror=x&gt;')
    expect(html).toContain('&lt;b&gt;t&lt;/b&gt;')
  })

  it('is self-contained — no CDN, no external font, no build step', () => {
    const html = buildSlideshow(spec, {})
    // Those are blocked on the serving plane and fail silently, which is the
    // worst way for a stylesheet to go missing.
    expect(html).not.toMatch(/<link[^>]+href="https?:/)
    expect(html).not.toMatch(/<script[^>]+src="https?:/)
    expect(html).not.toMatch(/@import\s+url\(/)
  })

  it('gives every slide a dwell long enough to read it', () => {
    const html = buildSlideshow(spec, {})
    const dwell = JSON.parse(/const DWELL = (\[[^\]]*\])/.exec(html)[1])
    expect(dwell).toHaveLength(3)
    for (const ms of dwell) expect(ms).toBeGreaterThanOrEqual(2600)
  })

  it('respects reduced motion by not auto-advancing', () => {
    const html = buildSlideshow(spec, {})
    expect(html).toContain('prefers-reduced-motion')
    expect(html).toMatch(/let running = !reduced/)
  })

  it('names the slide in the URL, so "slide 4 is wrong" can be a link', () => {
    expect(buildSlideshow(spec, {})).toContain('history.replaceState')
  })

  it('puts the title where a person and the gallery both read it', () => {
    const html = buildSlideshow(spec, { title: 'PR #9 · sign-out', subtitle: 'two fixes' })
    expect(html).toContain('<title>PR #9 · sign-out</title>')
    expect(html).toContain('two fixes')
  })
})
