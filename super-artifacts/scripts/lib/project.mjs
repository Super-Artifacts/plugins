/**
 * Resolving things from the project being recorded rather than from the plugin.
 *
 * Node resolves a bare specifier against the importing *file*, and this plugin's
 * files live wherever Claude Code installed them. `createRequire` pointed at a
 * path inside the project moves the resolution base to where the dependencies
 * actually are.
 *
 * `projectRoots` exists because a monorepo does not keep its dependencies at the
 * top. This repo is the example that forced it: `@playwright/test` is a
 * dependency of `apps/platform`, so a search that looked only at the workspace
 * root would conclude Playwright was absent while `apps/platform/node_modules`
 * held it.
 */

import { existsSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/** Directories worth resolving from, nearest first. */
export function nestedRoots(cwd, { readdir = readdirSync, exists = existsSync } = {}) {
  const roots = []
  // The conventional monorepo shapes, and only one level down. Walking the
  // whole tree would be slow on a big repo and would find test fixtures.
  for (const group of ['apps', 'packages', 'services', 'workers']) {
    const dir = join(cwd, group)
    if (!exists(dir)) continue
    let entries = []
    try {
      entries = readdir(dir)
    } catch {
      continue
    }
    for (const entry of entries) {
      const candidate = join(dir, entry)
      if (exists(join(candidate, 'node_modules'))) roots.push(candidate)
    }
  }
  return roots
}

export const projectRoots = (cwd) => nestedRoots(cwd)

/**
 * An importer `loadPlaywright` can walk.
 *
 * Resolution and import are separate steps on purpose: `require.resolve` throws
 * the useful error (`MODULE_NOT_FOUND` for this root) while the dynamic import
 * of an already-resolved absolute path fails only for real load errors, which
 * are worth surfacing differently.
 */
export const projectImporter = async (specifier, root) => {
  const require = createRequire(join(root, 'package.json'))
  const resolved = require.resolve(specifier)
  return import(pathToFileURL(resolved).href)
}
