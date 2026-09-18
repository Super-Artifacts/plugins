/**
 * The tour spec: what the agent writes, and what the recorder will drive.
 *
 * This is the generalisation of `apps/platform/tours/*.tour.ts` to a repo the
 * plugin has never seen. Those are Playwright specs, committed, reviewed, and
 * selected by a checked-in coverage manifest. None of that exists on a
 * stranger's machine, so the agent writes the tour *from its own diff*, as data,
 * and this validates it before a browser is launched.
 *
 * Data rather than code on purpose. A generated Playwright file would be
 * arbitrary code executed by a recorder that is supposed to be predictable, and
 * every failure in it would surface as a stack trace from inside a test runner
 * the person never asked to run. A closed step vocabulary fails with a sentence
 * about the step instead.
 *
 * The rules encoded here are convention #11's, which is where they were learned:
 *
 * - **One change is one key change**, and it becomes one card and one mp4.
 * - **Everything before the first caption is trimmed**, so setup costs the
 *   reviewer nothing — and narrating setup costs them everything.
 * - **A change stands alone.** It gets a fresh page; it cannot assume another
 *   ran, because most of the time none did.
 */

/** Steps the recorder knows how to perform. Anything else is refused by name. */
export const STEPS = new Set([
  'goto',
  'say',
  'click',
  'fill',
  'press',
  'wait',
  'highlight',
  'scrollTo',
  'showAddress',
])

/** Steps that reach for an element and therefore need a selector. */
const NEEDS_SELECTOR = new Set(['click', 'fill', 'highlight', 'scrollTo'])

/**
 * How long a caption stays up.
 *
 * `max(2.6s, words / 3.2)` — about 190 words a minute, which is unhurried
 * reading rather than skimming, with a floor so a three-word caption does not
 * flash past. Burned-in captions are read, not heard, and a caption the reviewer
 * has to scrub back for is worse than a slightly slow one.
 */
export function readingTimeMs(text, { wordsPerSecond = 3.2, floorMs = 2600 } = {}) {
  const words = String(text ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  if (words === 0) return floorMs
  return Math.max(floorMs, Math.round((words / wordsPerSecond) * 1000))
}

/**
 * Validate the whole spec before anything is launched.
 *
 * Collects every problem rather than throwing on the first: an agent that gets
 * one error, fixes it, and gets another has to re-run a browser each time.
 */
export function validateSpec(spec) {
  const problems = []

  if (spec === null || typeof spec !== 'object') {
    return { ok: false, problems: ['the spec is not an object.'] }
  }

  const changes = Array.isArray(spec.changes) ? spec.changes : []
  if (changes.length === 0) {
    problems.push('the spec has no changes — there is nothing to record.')
  }

  changes.forEach((change, index) => {
    const where = `changes[${index}]`
    if (typeof change?.title !== 'string' || change.title.trim() === '') {
      problems.push(`${where} needs a title — it becomes the card and the deep link.`)
    }

    const steps = Array.isArray(change?.steps) ? change.steps : []
    if (steps.length === 0) {
      problems.push(`${where} has no steps.`)
    }

    const captions = steps.filter((step) => typeof step?.say === 'string' && step.say.trim() !== '')
    if (captions.length === 0) {
      // Without one there is no chapter, nothing to trim to, and a silent clip.
      problems.push(
        `${where} never says anything. A change needs at least one caption — it is what becomes a chapter, and what the lead-in is trimmed to.`,
      )
    }

    steps.forEach((step, stepIndex) => {
      const at = `${where}.steps[${stepIndex}]`
      if (step === null || typeof step !== 'object') {
        problems.push(`${at} is not an object.`)
        return
      }
      const keys = Object.keys(step).filter((key) => STEPS.has(key))
      if (keys.length === 0) {
        const given = Object.keys(step).join(', ') || '(empty)'
        problems.push(
          `${at} has no known step. Given: ${given}. Known steps: ${[...STEPS].join(', ')}.`,
        )
        return
      }
      for (const key of keys) {
        if (NEEDS_SELECTOR.has(key) && String(step[key] ?? '').trim() === '') {
          problems.push(`${at}.${key} needs a selector.`)
        }
        if (key === 'fill' && typeof step.value !== 'string') {
          problems.push(`${at}.fill needs a "value" to type.`)
        }
      }
    })
  })

  return { ok: problems.length === 0, problems }
}

/**
 * Where each caption falls, given how long the ones before it were held.
 *
 * Offsets are relative to the **first caption**, not to the start of the
 * recording, because the lead-in is cut off the front. This is the arithmetic
 * the player's seek marks depend on, and getting it wrong puts every chapter a
 * few seconds off in a way that looks like the video is fine and the marks are
 * random.
 */
export function plannedChapters(change, options) {
  const chapters = []
  let elapsed = 0
  let started = false

  for (const step of change.steps ?? []) {
    const caption = typeof step?.say === 'string' ? step.say.trim() : ''
    if (caption === '') continue

    chapters.push({ title: caption, startSeconds: started ? elapsed / 1000 : 0 })
    if (!started) started = true
    elapsed += readingTimeMs(caption, options)
  }
  return chapters
}
