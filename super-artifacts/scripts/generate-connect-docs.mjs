#!/usr/bin/env node
/**
 * Generate docs/connect/*.md from AGENT_GUIDES.
 *
 * The dashboard's agent directory and these pages are one source of truth: the
 * tier, the steps and the reference link all come out of
 * `apps/platform/src/lib/agent-guides.ts`. Editing a page by hand is how a page
 * and the dashboard drift — edit the guide, run this, commit both.
 *
 * Usage: node plugins/super-artifacts/scripts/generate-connect-docs.mjs
 *
 * The guides file is TypeScript but pure data; it is read as text, the type
 * annotations are stripped, and the `AGENT_GUIDES` literal is evaluated. No
 * build step, no dependency.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '..', '..', '..')
const guidesPath = path.join(repo, 'apps', 'platform', 'src', 'lib', 'agent-guides.ts')
const OUT_DIR = path.join(here, '..', 'docs', 'connect')

const TIER_TITLES = { mcp: 'MCP', skill: 'Skill' }
const TIER_BLURBS = {
  mcp: 'connects through MCP; OAuth through the harness itself',
  skill: 'installs the durable skill; a key from the dashboard',
}

/** Pull the `AGENT_GUIDES = [ … ]` array literal out of the TS source and eval it. */
async function loadGuides() {
  const source = await readFile(guidesPath, 'utf8')
  const start = source.indexOf('export const AGENT_GUIDES')
  if (start === -1) throw new Error('AGENT_GUIDES not found in agent-guides.ts')
  // The array literal's real `[` — the first `[` after the `=` — so the
  // type annotation's brackets are skipped.
  const eq = source.indexOf('=', start)
  const literalStart = source.indexOf('[', eq)
  // Walk to the matching closing bracket.
  let depth = 0
  let end = literalStart
  for (let i = literalStart; i < source.length; i += 1) {
    if (source[i] === '[') depth += 1
    else if (source[i] === ']') {
      depth -= 1
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  const literal = source.slice(literalStart, end + 1)
  // The literal references the module's own constants (`KEY_STEP`, the token
  // exports); define them here as the values they hold, so the array
  // evaluates without importing the TypeScript module.
  const KEY_STEP = {
    title: 'Set the key',
    detail:
      'Copy an API key from the API keys page and set it as SUPER_ARTIFACTS_KEY in the environment this agent runs in. The key publishes under your handle and nothing else; revoke it from the roster on the agents page.',
    code: 'SUPER_ARTIFACTS_KEY={{key}}',
  }
  return new Function(
    'PROMPT_TOKEN',
    'KEY_TOKEN',
    'SKILL_URL_TOKEN',
    'MCP_URL_TOKEN',
    'KEY_STEP',
    `return ${literal}`,
  )('{{prompt}}', '{{key}}', '{{skillUrl}}', '{{mcpUrl}}', KEY_STEP)
}

function render(guide) {
  const lines = []
  lines.push(`# ${guide.name}`)
  lines.push('')
  lines.push(
    `> ${guide.vendor} · tier: **${TIER_TITLES[guide.tier]}** — ${TIER_BLURBS[guide.tier]} · publishes ${guide.publish === 'connector' ? 'through a connector' : 'directly'} · kept in ${guide.persistence}`,
  )
  lines.push('')
  lines.push(guide.summary)
  lines.push('')
  guide.steps.forEach((step, index) => {
    lines.push(`## ${index + 1}. ${step.title}`)
    lines.push('')
    lines.push(step.detail)
    lines.push('')
    if (step.code !== undefined) {
      lines.push('```')
      lines.push(step.code)
      lines.push('```')
      lines.push('')
    }
  })
  lines.push(`Checked against [${guide.reference.label}](${guide.reference.href}).`)
  lines.push('')
  return lines.join('\n')
}

const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

await mkdir(OUT_DIR, { recursive: true })
const guides = await loadGuides()
let written = 0
for (const guide of guides) {
  const file = path.join(OUT_DIR, `${slug(guide.name)}.md`)
  await writeFile(file, render(guide))
  written += 1
}
console.log(`wrote ${written} connect pages`)
