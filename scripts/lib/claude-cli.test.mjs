import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeClaudeFailure } from './claude-cli.mjs'

test('describeClaudeFailure: reports the exit status', () => {
  const message = describeClaudeFailure({ status: 1, stdout: '', stderr: '', env: { ANTHROPIC_API_KEY: 'k' } })
  assert.ok(message.includes('exited with 1'))
})

test('describeClaudeFailure: shows stdout — the CLI reports auth errors there, not on stderr', () => {
  const message = describeClaudeFailure({
    status: 1,
    stdout: 'Invalid API key · Please run /login',
    stderr: '',
    env: { ANTHROPIC_API_KEY: 'k' },
  })
  assert.ok(message.includes('Invalid API key'))
})

test('describeClaudeFailure: shows stderr when the CLI wrote there', () => {
  const message = describeClaudeFailure({ status: 2, stdout: '', stderr: 'boom', env: { ANTHROPIC_API_KEY: 'k' } })
  assert.ok(message.includes('boom'))
})

test('describeClaudeFailure: hints about credentials when neither token is set', () => {
  const message = describeClaudeFailure({ status: 1, stdout: '', stderr: '', env: {} })
  assert.ok(message.includes('ANTHROPIC_API_KEY'))
  assert.ok(message.includes('CLAUDE_CODE_OAUTH_TOKEN'))
})

test('describeClaudeFailure: no credentials hint when a token is present', () => {
  const withApiKey = describeClaudeFailure({ status: 1, stdout: 'x', stderr: '', env: { ANTHROPIC_API_KEY: 'k' } })
  const withOauth = describeClaudeFailure({ status: 1, stdout: 'x', stderr: '', env: { CLAUDE_CODE_OAUTH_TOKEN: 't' } })

  assert.ok(!withApiKey.includes('не задан'))
  assert.ok(!withOauth.includes('не задан'))
})

test('describeClaudeFailure: keeps the tail of long output', () => {
  const message = describeClaudeFailure({
    status: 1,
    stdout: `${'x'.repeat(9000)}THE-END`,
    stderr: '',
    env: { ANTHROPIC_API_KEY: 'k' },
  })

  assert.ok(message.length < 9000)
  assert.ok(message.includes('THE-END'))
})

test('describeClaudeFailure: never echoes the token value', () => {
  const message = describeClaudeFailure({ status: 1, stdout: '', stderr: '', env: { ANTHROPIC_API_KEY: 'sk-secret' } })
  assert.ok(!message.includes('sk-secret'))
})
