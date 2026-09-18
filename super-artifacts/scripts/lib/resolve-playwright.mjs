/**
 * Find a Playwright the *user's project* owns, not one the plugin happens to
 * sit beside.
 *
 * A plugin script is imported from wherever the plugin was installed —
 * `~/.claude/plugins/cache/...` — so a bare `import('playwright')` resolves
 * against that directory and finds nothing, however thoroughly the repo being
 * recorded has Playwright installed. This repo demonstrates the trap in its own
 * checkout: `@playwright/test` resolves from `apps/platform` and not from the
 * workspace root, so the naive import fails two directories away from a working
 * install.
 *
 * So resolution starts at the project and walks outward, and the *order* is the
 * part worth testing — the loading itself is one dynamic import.
 *
 * `playwright` before `@playwright/test`: both export `chromium`, but
 * `@playwright/test` drags in the test runner's globals, and a project that has
 * only the runner still works while a project that has both should get the
 * lighter one.
 */

/** The specifiers to try, in order, and where each is resolved from. */
export function candidates({ cwd, pluginRoot, extraRoots = [] }) {
  const roots = [cwd, ...extraRoots, pluginRoot].filter(
    (value) => typeof value === 'string' && value !== '',
  )

  const seen = new Set()
  const out = []
  for (const root of roots) {
    for (const specifier of ['playwright', '@playwright/test']) {
      const key = `${root}::${specifier}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ root, specifier })
    }
  }
  return out
}

/**
 * The message a project with no Playwright gets.
 *
 * It names the fallback on purpose. A recorder that says only "install this"
 * reads as broken; the plugin still produces an artifact without a browser, and
 * a person deciding whether to spend two minutes on an install should know what
 * they get for it.
 */
export const MISSING =
  'No Playwright in this project. Install it for real screen capture — `npm i -D playwright && npx playwright install chromium` — or continue and the walkthrough is built as a narrated slideshow instead.'

/**
 * Where `chromium` actually lives on a dynamically imported module.
 *
 * `@playwright/test` is CommonJS. `import()` of a CJS module produces a
 * namespace whose named exports Node detects statically where it can, and puts
 * the whole `module.exports` on `.default` regardless — for this package the
 * detection does not find `chromium`, so `module.chromium` is `undefined` beside
 * a `module.default.chromium` that works perfectly.
 *
 * This shipped as a bug for exactly one test run: the resolver found
 * `@playwright/test`, saw no `chromium`, dutifully recorded "no chromium export"
 * and reported that Playwright was not installed — on a machine with a working
 * install two directories away. Reading both places is the fix, and it is
 * cheap; guessing which one applies from the specifier is not, because a
 * package can change its build without changing its name.
 */
export const browserFrom = (module) => module?.chromium ?? module?.default?.chromium

/**
 * @param importer resolves a specifier from a root, so the walk is testable
 *                 without installing four copies of Playwright.
 */
export async function loadPlaywright({ cwd, pluginRoot, extraRoots, importer }) {
  const tried = []
  for (const candidate of candidates({ cwd, pluginRoot, extraRoots })) {
    try {
      const module = await importer(candidate.specifier, candidate.root)
      const chromium = browserFrom(module)
      if (chromium !== undefined) {
        return { ok: true, chromium, from: candidate }
      }
      // Resolved but not what we need — worth recording, because "found a
      // package called playwright that exports no browser" is a different
      // problem from "found nothing" and has a different fix.
      tried.push(`${candidate.specifier} (no chromium export)`)
    } catch {
      tried.push(candidate.specifier)
    }
  }
  return { ok: false, message: MISSING, tried }
}
