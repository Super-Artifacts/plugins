import { describe, expect, it } from 'vitest'
import { browserFrom, candidates, loadPlaywright, MISSING } from './resolve-playwright.mjs'

describe('browserFrom', () => {
  it('reads a real ES module namespace', () => {
    const chromium = {}
    expect(browserFrom({ chromium })).toBe(chromium)
  })

  /**
   * `@playwright/test` is CommonJS, so `import()` hangs its exports off
   * `.default` and `module.chromium` is undefined beside a working
   * `module.default.chromium`. Reading only the first place made the resolver
   * report "not installed" on a machine that had it — which is what this test
   * pins.
   */
  it('reads a CommonJS module imported through import(), where it sits on default', () => {
    const chromium = {}
    expect(browserFrom({ default: { chromium } })).toBe(chromium)
  })

  it('is undefined when the module is neither', () => {
    expect(browserFrom({ default: {} })).toBeUndefined()
    expect(browserFrom(undefined)).toBeUndefined()
  })
})

describe('candidates', () => {
  /**
   * The whole point: a plugin lives in `~/.claude/plugins/cache/...` and the
   * Playwright that matters belongs to the repo being recorded. Searching the
   * plugin first would find the wrong one on a machine that has both.
   */
  it('looks in the project before the plugin', () => {
    const order = candidates({ cwd: '/repo', pluginRoot: '/plugin' })
    expect(order[0]).toEqual({ root: '/repo', specifier: 'playwright' })
    expect(order.at(-1)).toEqual({ root: '/plugin', specifier: '@playwright/test' })
  })

  /**
   * `@playwright/test` also exports chromium, but it pulls the runner's globals
   * with it — so a project holding both should get the lighter package.
   */
  it('prefers playwright over @playwright/test within one root', () => {
    const [first, second] = candidates({ cwd: '/repo', pluginRoot: '/plugin' })
    expect(first.specifier).toBe('playwright')
    expect(second.specifier).toBe('@playwright/test')
  })

  /**
   * This repo is the worked example: `@playwright/test` resolves from
   * `apps/platform` and not from the workspace root, so a search that stopped at
   * the project root would report "not installed" two directories from a working
   * install.
   */
  it('searches extra roots between the project and the plugin', () => {
    const order = candidates({
      cwd: '/repo',
      pluginRoot: '/plugin',
      extraRoots: ['/repo/apps/platform'],
    })
    expect(order.map((c) => c.root)).toEqual([
      '/repo',
      '/repo',
      '/repo/apps/platform',
      '/repo/apps/platform',
      '/plugin',
      '/plugin',
    ])
  })

  it('does not try the same pair twice when a root repeats', () => {
    const order = candidates({ cwd: '/repo', pluginRoot: '/repo' })
    expect(order).toHaveLength(2)
  })

  it('drops roots that are not paths', () => {
    expect(candidates({ cwd: '/repo', pluginRoot: undefined })).toHaveLength(2)
  })
})

describe('loadPlaywright', () => {
  const chromium = { launch: () => {} }

  it('returns the first module that actually exports a browser', async () => {
    const importer = async (specifier, root) => {
      if (root === '/repo/apps/platform' && specifier === '@playwright/test') return { chromium }
      throw new Error('not found')
    }

    const result = await loadPlaywright({
      cwd: '/repo',
      pluginRoot: '/plugin',
      extraRoots: ['/repo/apps/platform'],
      importer,
    })

    expect(result.ok).toBe(true)
    expect(result.chromium).toBe(chromium)
    expect(result.from).toEqual({ root: '/repo/apps/platform', specifier: '@playwright/test' })
  })

  /**
   * A package that resolves but exports no browser is a different problem from
   * one that does not resolve, and the record of what was tried is what makes
   * the difference visible to whoever reads the failure.
   */
  it('keeps looking past a module that resolves without a chromium export', async () => {
    const importer = async (specifier) => {
      if (specifier === 'playwright') return { somethingElse: true }
      return { chromium }
    }

    const result = await loadPlaywright({ cwd: '/repo', pluginRoot: '/plugin', importer })
    expect(result.ok).toBe(true)
    expect(result.from.specifier).toBe('@playwright/test')
  })

  it('names the slideshow fallback when nothing resolves, rather than only the install', async () => {
    const result = await loadPlaywright({
      cwd: '/repo',
      pluginRoot: '/plugin',
      importer: async () => {
        throw new Error('not found')
      },
    })

    expect(result.ok).toBe(false)
    expect(result.message).toBe(MISSING)
    expect(result.message).toMatch(/slideshow/)
    expect(result.tried.length).toBeGreaterThan(0)
  })
})
