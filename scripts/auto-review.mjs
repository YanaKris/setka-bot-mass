#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { resolveTaskContext } from './lib/issue-context.mjs'
import { findComment, writeComment } from './lib/gh-comment.mjs'
import { splitChecklist, extractHistory, appendHistoryEntry, composeBody, buildPrompt } from './lib/review-comment.mjs'
import { describeClaudeFailure } from './lib/claude-cli.mjs'

const MARKER = process.env.COMMENT_MARKER ?? '<!-- claude-auto-review v1 -->'
const TITLE = '## 🤖 Claude auto-review'
const CLAUDE_BIN = process.env.CLAUDE_BIN ?? 'claude'
const PERMISSION_MODE = process.env.CLAUDE_PERMISSION_MODE ?? 'dontAsk'
const REVIEW_LANGUAGE = process.env.REVIEW_LANGUAGE ?? 'Russian'

const env = (key) => {
  const value = process.env[key]
  if (!value) {
    console.error(`[auto-review] missing required env: ${key}`)
    process.exit(2)
  }
  return value
}

const PR_NUMBER = env('PR_NUMBER')
const REPO = env('REPO')
const HEAD_SHA = env('HEAD_SHA')
const SHORT_SHA = HEAD_SHA.slice(0, 7)
const TIMESTAMP = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

function runClaude(prompt) {
  const args = ['--print', '--no-session-persistence']
  if (PERMISSION_MODE) args.push('--permission-mode', PERMISSION_MODE)

  const result = spawnSync(CLAUDE_BIN, args, {
    input: prompt,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
  })
  if (result.error) {
    console.error(`[auto-review] failed to spawn ${CLAUDE_BIN}: ${result.error.message}`)
    process.exit(1)
  }
  if (result.status !== 0) {
    console.error(describeClaudeFailure({ status: result.status, stdout: result.stdout, stderr: result.stderr }))
    process.exit(result.status ?? 1)
  }
  if (result.stderr?.trim()) {
    console.error(`[auto-review] claude stderr:\n${result.stderr.trim().slice(0, 4000)}`)
  }
  return result.stdout.trim()
}

function main() {
  console.log(`[auto-review] PR #${PR_NUMBER} @ ${SHORT_SHA}`)

  const taskContext = resolveTaskContext({
    env: { ...process.env, REPO },
    log: (message) => console.error(message),
  })
  console.log(`[auto-review] task context: ${taskContext ? 'attached' : 'none'}`)

  const existing = findComment({ repo: REPO, pr: PR_NUMBER, marker: MARKER })
  console.log(`[auto-review] mode: ${existing ? 'update' : 'initial'}`)

  const review = runClaude(
    buildPrompt({
      prNumber: PR_NUMBER,
      repo: REPO,
      shortSha: SHORT_SHA,
      previousBody: existing?.body ?? '',
      taskContext: taskContext ?? '',
      language: REVIEW_LANGUAGE,
    })
  )
  if (!review) {
    console.error('[auto-review] claude returned empty output, aborting comment update')
    process.exit(1)
  }

  const { reviewBody, checklist } = splitChecklist(review)
  const heading = existing ? '### Update' : '### Initial review'
  const entry = `${heading} — ${TIMESTAMP} — \`${SHORT_SHA}\`\n\n${reviewBody}`
  const history = appendHistoryEntry(extractHistory(existing?.body), entry)

  const result = writeComment({
    repo: REPO,
    pr: PR_NUMBER,
    id: existing?.id,
    body: composeBody({ marker: MARKER, title: TITLE, checklist, history }),
  })
  console.log(
    result.action === 'updated' ? `[auto-review] updated comment ${result.id}` : '[auto-review] created new comment'
  )
}

try {
  main()
} catch (error) {
  console.error(`[auto-review] fatal: ${error.message}`)
  process.exit(1)
}
