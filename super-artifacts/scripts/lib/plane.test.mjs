import { describe, expect, it } from 'vitest'
import { keyFingerprint, planeFor } from './plane.mjs'

describe('planeFor', () => {
  it('sends a staging key to the staging plane', () => {
    const plane = planeFor('sa_stg_abcdefghijklmnop')
    expect(plane).toMatchObject({
      ok: true,
      environment: 'staging',
      api: 'https://api-stg.superart.page',
      artifact: 'https://stg.superart.page',
    })
  })

  it('sends a production key to the production plane', () => {
    expect(planeFor('sa_live_abcdefghijklmnop')).toMatchObject({
      ok: true,
      environment: 'production',
      api: 'https://api.superart.page',
    })
  })

  /**
   * The failure `agent-key.ts` records in full: a key whose plane cannot be read
   * off it is how an artifact lands on the wrong plane, under a different
   * account, on a different database, with nothing on the intended plane ever
   * contacted. Refusing is the only safe reading of an unrecognised prefix.
   */
  it('refuses an unrecognised prefix rather than defaulting to production', () => {
    const plane = planeFor('nonsense_abcdefghijklmnop')
    expect(plane.ok).toBe(false)
    expect(plane.message).toMatch(/guessing production/)
  })

  it('says what to do when there is no key at all', () => {
    expect(planeFor('').message).toMatch(/SUPER_ARTIFACTS_KEY/)
    expect(planeFor(undefined).ok).toBe(false)
  })

  /**
   * A dev key names a worker on a port only its own worktree knows, so there is
   * nothing to hardcode — and the message has to say that rather than telling
   * somebody with a good local key that the key is malformed.
   */
  it('asks a dev key for its address instead of calling it malformed', () => {
    const plane = planeFor('sa_dev_abcdefghijklmnop')
    expect(plane.ok).toBe(false)
    expect(plane.message).toMatch(/dev plane has no fixed address/)
    expect(plane.message).not.toMatch(/does not name a plane/)
  })

  it('accepts a dev key once it is told where the plane is', () => {
    expect(planeFor('sa_dev_abc', { apiOrigin: 'http://127.0.0.1:8912/__api' })).toMatchObject({
      ok: true,
      environment: 'dev',
      artifact: 'http://127.0.0.1:8912',
    })
  })

  // A preview plane serves staging's API under a different platform host, and
  // there is no prefix that distinguishes it.
  it('lets an explicit origin override the one the prefix implies', () => {
    expect(planeFor('sa_stg_abc', { apiOrigin: 'https://api-preview.example' }).api).toBe(
      'https://api-preview.example',
    )
  })
})

describe('keyFingerprint', () => {
  /** Convention #7: never echo a secret into a log, and a transcript is a log. */
  it('identifies a key without reproducing it', () => {
    const print = keyFingerprint('sa_stg_abcdefghijklmnopqrstuvwxyz')
    expect(print).toBe('sa_stg_…wxyz')
    expect(print).not.toContain('abcdefghij')
  })

  it('says so when there is nothing to print', () => {
    expect(keyFingerprint('')).toBe('(none)')
  })
})
