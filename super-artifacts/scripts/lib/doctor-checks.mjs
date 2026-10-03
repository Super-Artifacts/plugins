/**
 * What the doctor decides, separated from what it touches.
 *
 * The connecting half — HTTP to the serving plane, spawning `npx playwright`,
 * reading the environment — lives in `doctor.mjs` and is not unit tested,
 * because a test that stubs a fetch proves the stub works. What is tested here
 * is the part that has actually been got wrong in this repo before: which
 * failures should stop a run and which should only be reported.
 *
 * The distinction matters more than it looks. `pnpm mcp:doctor` earned
 * convention #17's rule — *verify by connecting, never by reading the config* —
 * because a server holding a revoked token is indistinguishable from a working
 * one until something asks it a question. The same trap is here: a key that is
 * present in the environment and rejected by the plane looks exactly like a
 * working setup to anything that only checks whether the variable is set.
 */

/** A check that must pass before recording is worth starting. */
export const REQUIRED = 'required'
/** A check whose failure narrows what the plugin can do but does not stop it. */
export const ADVISORY = 'advisory'

export const PASS = 'pass'
export const FAIL = 'fail'
export const SKIP = 'skip'

/**
 * One finding.
 *
 * `fix` is not optional on a failure and that is enforced below, because a
 * diagnostic that says what is wrong and not what to do about it sends the
 * reader to a search engine — which is the state the doctor exists to replace.
 */
export function finding(name, { status, tier = REQUIRED, detail = '', fix = '' }) {
  if (status === FAIL && fix === '') {
    throw new Error(`the "${name}" check failed without saying how to fix it.`)
  }
  return { name, status, tier, detail, fix }
}

export const pass = (name, detail, tier = REQUIRED) => finding(name, { status: PASS, tier, detail })

export const fail = (name, detail, fix, tier = REQUIRED) =>
  finding(name, { status: FAIL, tier, detail, fix })

export const skip = (name, detail, tier = ADVISORY) => finding(name, { status: SKIP, tier, detail })

/**
 * The verdict over a whole run.
 *
 * A required failure is the only thing that makes this non-zero. An advisory
 * failure is reported at the same volume and changes nothing about the exit
 * code, because the recorder degrades — no browser means the slideshow tier,
 * which is a worse video and not a broken one.
 *
 * A skipped required check is **not** a pass. That is the same rule
 * `scripts/e2e/all.sh` enforces about tiers, and for the same reason: a gate
 * that can be satisfied by not running is not a gate.
 */
export function verdict(findings) {
  const blocking = findings.filter(
    (f) => f.tier === REQUIRED && (f.status === FAIL || f.status === SKIP),
  )
  const advisories = findings.filter((f) => f.tier === ADVISORY && f.status === FAIL)

  return {
    ok: blocking.length === 0,
    exitCode: blocking.length === 0 ? 0 : 1,
    blocking,
    advisories,
    /** Which recorder tier the findings leave available. */
    recorder: recorderTier(findings),
  }
}

/**
 * Which tier of recording is actually available, from what answered.
 *
 * This is the doctor's most useful single output: it is the difference between
 * an agent that records a real walkthrough and one that confidently produces a
 * slideshow while a perfectly good browser sits uninstalled. Convention #11's
 * standing rule is that a confident artefact about the wrong thing is worse than
 * none, and silently dropping a tier is a quiet way to produce one.
 */
export function recorderTier(findings) {
  const byName = new Map(findings.map((f) => [f.name, f]))
  const ok = (name) => byName.get(name)?.status === PASS

  if (ok('browser') && ok('ffmpeg')) return 'browser'
  return 'slideshow'
}

/** Human-readable, one line per check, in the order they were run. */
export function report(findings) {
  const mark = { [PASS]: 'ok  ', [FAIL]: 'FAIL', [SKIP]: 'skip' }
  const lines = findings.map((f) => {
    const suffix = f.tier === ADVISORY && f.status === FAIL ? ' (advisory)' : ''
    return `  ${mark[f.status]}  ${f.name}${suffix}${f.detail === '' ? '' : ` — ${f.detail}`}`
  })

  const fixes = findings.filter((f) => f.status === FAIL).map((f) => `  ${f.name}: ${f.fix}`)

  if (fixes.length > 0) lines.push('', 'To fix:', ...fixes)
  return lines.join('\n')
}
