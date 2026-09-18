import { describe, expect, it } from 'vitest'
import {
  ADVISORY,
  fail,
  finding,
  pass,
  REQUIRED,
  recorderTier,
  report,
  skip,
  verdict,
} from './doctor-checks.mjs'

describe('finding', () => {
  /**
   * The rule that keeps the doctor from becoming a wall of red with no next
   * step. It is enforced at construction rather than at print time so the
   * omission fails in the author's own test run, not in a user's terminal.
   */
  it('refuses a failure that does not say how to fix it', () => {
    expect(() => finding('browser', { status: 'fail' })).toThrow(/how to fix/)
  })

  it('does not demand a fix from a check that passed', () => {
    expect(() => pass('key', 'azim')).not.toThrow()
  })
})

describe('verdict', () => {
  it('is green when every required check passed', () => {
    const result = verdict([pass('key', 'azim'), pass('plane', '200')])
    expect(result.ok).toBe(true)
    expect(result.exitCode).toBe(0)
  })

  it('is red on a required failure', () => {
    const result = verdict([
      pass('key', 'azim'),
      fail('plane', '401', 'Pair again from the Agents page.'),
    ])
    expect(result.ok).toBe(false)
    expect(result.exitCode).toBe(1)
    expect(result.blocking.map((f) => f.name)).toEqual(['plane'])
  })

  /**
   * The same rule `scripts/e2e/all.sh` holds about tiers: a gate that can be
   * satisfied by not running is not a gate.
   */
  it('treats a skipped required check as blocking, not as a pass', () => {
    const result = verdict([skip('plane', 'no network', REQUIRED)])
    expect(result.ok).toBe(false)
  })

  it('reports an advisory failure without failing the run', () => {
    const result = verdict([
      pass('key', 'azim'),
      fail('browser', 'chromium missing', 'npx playwright install chromium', ADVISORY),
    ])
    expect(result.ok).toBe(true)
    expect(result.exitCode).toBe(0)
    expect(result.advisories.map((f) => f.name)).toEqual(['browser'])
  })
})

describe('recorderTier', () => {
  it('offers real capture only when both halves of it answered', () => {
    expect(recorderTier([pass('browser'), pass('ffmpeg')])).toBe('browser')
  })

  /**
   * The quiet failure this exists to surface: a missing browser degrades the
   * artefact rather than breaking the run, so nothing else would ever mention
   * it — and the reviewer gets a slideshow that looks deliberate.
   */
  it('falls back to the slideshow when the browser is missing, and says so', () => {
    const findings = [
      pass('ffmpeg'),
      fail('browser', 'chromium missing', 'npx playwright install chromium', ADVISORY),
    ]
    expect(recorderTier(findings)).toBe('slideshow')
    expect(verdict(findings).recorder).toBe('slideshow')
  })

  it('falls back when ffmpeg is the missing half', () => {
    expect(
      recorderTier([pass('browser'), fail('ffmpeg', 'not found', 'install ffmpeg', ADVISORY)]),
    ).toBe('slideshow')
  })
})

describe('report', () => {
  it('prints one line per check and collects the fixes underneath', () => {
    const text = report([
      pass('key', 'azim'),
      fail('browser', 'chromium missing', 'npx playwright install chromium', ADVISORY),
    ])

    expect(text).toContain('ok    key — azim')
    expect(text).toContain('FAIL  browser (advisory) — chromium missing')
    expect(text).toContain('To fix:')
    expect(text).toContain('npx playwright install chromium')
  })

  it('omits the fix section entirely when nothing failed', () => {
    expect(report([pass('key', 'azim')])).not.toContain('To fix:')
  })
})
