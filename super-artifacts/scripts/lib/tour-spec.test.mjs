import { describe, expect, it } from 'vitest'
import { plannedChapters, readingTimeMs, STEPS, validateSpec } from './tour-spec.mjs'

const change = {
  title: 'Sign-out names its destination',
  steps: [
    { goto: '/login' },
    { click: 'text=Sign in' },
    { say: 'Signing out used to land on whatever WorkOS picked.' },
    { say: 'Now it names the destination, so the session ends where the person expects.' },
  ],
}

describe('readingTimeMs', () => {
  it('holds a caption long enough to actually read it', () => {
    // Burned-in captions are read, not heard; scrubbing back is worse than slow.
    expect(readingTimeMs('one two three four five six seven eight nine ten')).toBe(3125)
  })

  it('floors a very short caption so it does not flash past', () => {
    expect(readingTimeMs('It works')).toBe(2600)
    expect(readingTimeMs('')).toBe(2600)
    expect(readingTimeMs(undefined)).toBe(2600)
  })
})

describe('validateSpec', () => {
  it('accepts a well-formed spec', () => {
    expect(validateSpec({ changes: [change] })).toEqual({ ok: true, problems: [] })
  })

  it('refuses a spec that is not an object at all', () => {
    expect(validateSpec(null).ok).toBe(false)
    expect(validateSpec('a tour').ok).toBe(false)
  })

  it('refuses a spec with no changes', () => {
    const { ok, problems } = validateSpec({ changes: [] })
    expect(ok).toBe(false)
    expect(problems[0]).toMatch(/nothing to record/)
  })

  /**
   * A change with no caption produces a silent clip, no chapter, and nothing to
   * trim the lead-in to — three failures with one cause, so it is named once.
   */
  it('refuses a change that never says anything', () => {
    const { ok, problems } = validateSpec({
      changes: [{ title: 'Silent', steps: [{ goto: '/' }] }],
    })
    expect(ok).toBe(false)
    expect(problems.join('\n')).toMatch(/never says anything/)
  })

  it('requires a title, because it becomes the card and the deep link', () => {
    const { problems } = validateSpec({
      changes: [{ steps: [{ say: 'hello' }] }],
    })
    expect(problems.join('\n')).toMatch(/needs a title/)
  })

  /**
   * The closed vocabulary is the point: an unknown step is refused with the list
   * of known ones, rather than being silently skipped so the recording comes out
   * missing a beat nobody can account for.
   */
  it('names the unknown step and lists what it could have been', () => {
    const { ok, problems } = validateSpec({
      changes: [{ title: 'T', steps: [{ say: 'hi' }, { navigate: '/x' }] }],
    })
    expect(ok).toBe(false)
    const text = problems.join('\n')
    expect(text).toMatch(/navigate/)
    for (const step of STEPS) expect(text).toContain(step)
  })

  it('asks for a selector where a step needs one', () => {
    const { problems } = validateSpec({
      changes: [{ title: 'T', steps: [{ say: 'hi' }, { click: '' }] }],
    })
    expect(problems.join('\n')).toMatch(/click needs a selector/)
  })

  it('asks fill for something to type', () => {
    const { problems } = validateSpec({
      changes: [{ title: 'T', steps: [{ say: 'hi' }, { fill: '#email' }] }],
    })
    expect(problems.join('\n')).toMatch(/needs a "value"/)
  })

  /**
   * Collected, not thrown on the first: each round trip costs the agent a
   * browser launch, so one run should surface everything wrong with the spec.
   */
  it('reports every problem at once rather than the first', () => {
    const { problems } = validateSpec({
      changes: [{ steps: [] }, { steps: [{ nope: 1 }] }],
    })
    expect(problems.length).toBeGreaterThan(3)
  })
})

describe('plannedChapters', () => {
  /**
   * Offsets are relative to the first caption, because the lead-in is cut off
   * the front. Measuring from the start of the recording instead puts every mark
   * a few seconds late — which looks like the marks are random rather than that
   * the arithmetic is wrong.
   */
  it('starts the first chapter at zero, not at where it fell in the recording', () => {
    const [first] = plannedChapters(change)
    expect(first.startSeconds).toBe(0)
  })

  it('offsets each later chapter by the reading time of the ones before it', () => {
    const [, second] = plannedChapters(change)
    const firstCaption = 'Signing out used to land on whatever WorkOS picked.'
    expect(second.startSeconds).toBeCloseTo(readingTimeMs(firstCaption) / 1000, 3)
  })

  it('ignores steps that are not captions', () => {
    expect(plannedChapters(change)).toHaveLength(2)
  })

  it('returns nothing for a change with no steps rather than throwing', () => {
    expect(plannedChapters({})).toEqual([])
  })
})
