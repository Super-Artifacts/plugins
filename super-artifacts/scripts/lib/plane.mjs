/**
 * Which plane a key belongs to, and where that plane lives.
 *
 * The prefix is the only thing that says. `apps/platform/src/lib/agent-key.ts`
 * records why it exists at all: every key used to be `sa_live_` in every
 * environment, which made a staging key and a production key indistinguishable
 * to the agent holding them — and cost a real pairing, where an agent already
 * holding a staging key was handed a production line, saw `SUPER_ARTIFACTS_KEY`
 * was set, concluded it was already paired, and published the account's first
 * artifact to the wrong plane under a different account on a different database.
 * Nothing in production could catch it because nothing in production was ever
 * contacted.
 *
 * The plugin is exactly the surface that repeats that mistake if it guesses. So
 * the origin is *derived from the key*, never configured beside it, and an
 * unrecognised prefix is refused rather than defaulted to production.
 */

const PLANES = {
  sa_live_: {
    environment: 'production',
    api: 'https://api.superart.page',
    artifact: 'https://superart.page',
    platform: 'https://superartifacts.app',
  },
  sa_stg_: {
    environment: 'staging',
    api: 'https://api-stg.superart.page',
    artifact: 'https://stg.superart.page',
    platform: 'https://stg.superartifacts.app',
  },
}

/**
 * `sa_dev_` is deliberately absent from the table above.
 *
 * A dev key addresses a worker on a port that only its own worktree knows, so
 * there is no origin to hardcode — it has to be supplied. Naming the case is
 * better than letting it fall into the unknown-prefix branch, where the message
 * would tell somebody with a perfectly good local key that their key is
 * malformed.
 */
const DEV_PREFIX = 'sa_dev_'

export function planeFor(key, { apiOrigin } = {}) {
  const trimmed = String(key ?? '').trim()
  if (trimmed === '') {
    return {
      ok: false,
      message:
        'No key. Set SUPER_ARTIFACTS_KEY, or pair this agent from the Agents page at https://superartifacts.app/agents.',
    }
  }

  const prefix = Object.keys(PLANES).find((candidate) => trimmed.startsWith(candidate))
  if (prefix !== undefined) {
    const plane = PLANES[prefix]
    // An explicit origin still wins, because a preview plane serves staging's
    // API under a different platform host and there is no prefix for it.
    return { ok: true, ...plane, ...(apiOrigin === undefined ? {} : { api: apiOrigin }) }
  }

  if (trimmed.startsWith(DEV_PREFIX)) {
    if (apiOrigin === undefined) {
      return {
        ok: false,
        message:
          'That is a dev key, and a dev plane has no fixed address. Pass --api http://127.0.0.1:<wrangler port>/__api, or use a staging key.',
      }
    }
    return {
      ok: true,
      environment: 'dev',
      api: apiOrigin,
      artifact: apiOrigin.replace(/\/__api$/, ''),
      platform: 'http://localhost:3000',
    }
  }

  return {
    ok: false,
    message: `That key does not name a plane — it should start with sa_live_ or sa_stg_. Refusing rather than guessing, because guessing production is how an artifact lands on the wrong one.`,
  }
}

/**
 * Connect's case, and only connect's: there is no key yet, because getting one
 * is the point. Every other caller is right to refuse — so the fallback is here
 * rather than in `planeFor`, and it still resolves against the table above
 * instead of assembling a host from an argument. `connect --api <origin>` names
 * the plane; nothing names it, and it is production, which the consent screen
 * then states before anything is stored.
 */
export function planeForOrigin(apiOrigin) {
  if (apiOrigin === undefined || apiOrigin === null) {
    return { ok: true, ...PLANES.sa_live_ }
  }
  const origin = String(apiOrigin).trim().replace(/\/$/, '')
  const plane = Object.values(PLANES).find((p) => p.api === origin || p.platform === origin)
  if (plane !== undefined) return { ok: true, ...plane }
  return {
    ok: false,
    message: `${origin} is not a plane this plugin knows. Use ${PLANES.sa_live_.api} or ${PLANES.sa_stg_.api}.`,
  }
}

/** Never print a key. Enough to compare two machines, not enough to use. */
export function keyFingerprint(key) {
  const trimmed = String(key ?? '').trim()
  if (trimmed === '') return '(none)'
  const prefix = trimmed.slice(0, trimmed.indexOf('_', 3) + 1)
  return `${prefix}…${trimmed.slice(-4)}`
}
