import assert from 'node:assert/strict'
import { detectClient } from './client.mjs'

// Claude Code
assert.deepStrictEqual(detectClient({ CLAUDE_PLUGIN_ROOT: '/some/path' }), {
  id: 'claude-code',
  name: 'Claude Code',
})

// Cursor
assert.deepStrictEqual(detectClient({ CURSOR_SESSION_ID: 'abc' }), { id: 'cursor', name: 'Cursor' })

// OpenCode
assert.deepStrictEqual(detectClient({ OPENCODE_HOME: '/home/user/.opencode' }), {
  id: 'opencode',
  name: 'OpenCode',
})

// Unknown tool
assert.deepStrictEqual(detectClient({}), { id: 'unknown', name: 'CLI tool' })

// First match wins when multiple are set
assert.deepStrictEqual(detectClient({ CLAUDE_PLUGIN_ROOT: '/x', CURSOR_SESSION_ID: 'y' }), {
  id: 'claude-code',
  name: 'Claude Code',
})

// Empty string is not a match
assert.deepStrictEqual(detectClient({ CLAUDE_PLUGIN_ROOT: '' }), {
  id: 'unknown',
  name: 'CLI tool',
})

console.log('client detection: all passed')
