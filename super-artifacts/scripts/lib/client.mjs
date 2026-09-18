/**
 * Detect which CLI tool is running this plugin, so connect and init can adapt.
 *
 * Environment variables are the signal — each tool sets its own. The detection
 * is best-effort: an unrecognised tool gets a generic label and the flow still
 * works. Adding a tool is one entry in the table.
 */

const CLIENTS = [
  { env: 'CLAUDE_PLUGIN_ROOT', id: 'claude-code', name: 'Claude Code' },
  { env: 'CURSOR_SESSION_ID', id: 'cursor', name: 'Cursor' },
  { env: 'OPENCODE_HOME', id: 'opencode', name: 'OpenCode' },
  { env: 'PI_SESSION', id: 'pi', name: 'Pi' },
  { env: 'OHMYPI_ROOT', id: 'ohmypi', name: 'Oh my Pi' },
  { env: 'CODEX_SESSION', id: 'codex', name: 'Codex' },
  { env: 'HERMES_ROOT', id: 'hermes', name: 'Hermes' },
  { env: 'WINDSURF_SESSION', id: 'windsurf', name: 'Windsurf' },
]

/**
 * Returns `{ id, name }` for the CLI tool running this plugin.
 * Falls back to `{ id: 'unknown', name: 'CLI tool' }`.
 */
export function detectClient(env = process.env) {
  for (const client of CLIENTS) {
    if (typeof env[client.env] === 'string' && env[client.env] !== '') {
      return { id: client.id, name: client.name }
    }
  }
  return { id: 'unknown', name: 'CLI tool' }
}
