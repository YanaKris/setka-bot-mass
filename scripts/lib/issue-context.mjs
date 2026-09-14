import { spawnSync } from 'node:child_process'

const CLOSING_KEYWORD_RE = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)\b/i
const BRANCH_PREFIX_RE = /(?:^|\/)(\d+)-/
const TITLE_RE = /#(\d+)\b/

export function extractIssueNumber({ prBody, headRef, prTitle } = {}) {
  const sources = [
    [prBody, CLOSING_KEYWORD_RE],
    [headRef, BRANCH_PREFIX_RE],
    [prTitle, TITLE_RE],
  ]
  for (const [value, pattern] of sources) {
    const match = value ? String(value).match(pattern) : null
    if (match) return Number(match[1])
  }
  return null
}

export function fetchIssueViaGh(number, repo) {
  const args = ['issue', 'view', String(number), '--json', 'number,title,body']
  if (repo) args.push('--repo', repo)

  const result = spawnSync('gh', args, { encoding: 'utf8' })
  if (result.error) throw new Error(`gh issue view ${number}: ${result.error.message}`)
  if (result.status !== 0) {
    const stderr = result.stderr ? `\n${result.stderr.trim()}` : ''
    throw new Error(`gh issue view ${number} failed (exit ${result.status})${stderr}`)
  }
  return JSON.parse(result.stdout)
}

export function buildIssueContext(issue) {
  if (!issue?.number) return null
  const title = (issue.title ?? '').trim()
  const body = (issue.body ?? '').trim()
  if (!title && !body) return null

  const lines = [`## Task context (GitHub issue #${issue.number})`, '']
  if (title) lines.push(`### ${title}`, '')
  if (body) lines.push(body)
  return lines.join('\n').trim()
}

export function resolveTaskContext({ env = process.env, log = () => {}, fetchIssue = fetchIssueViaGh } = {}) {
  const number = extractIssueNumber({ prBody: env.PR_BODY, headRef: env.HEAD_REF, prTitle: env.PR_TITLE })
  if (!number) {
    log('[task-context] no issue reference in PR body/branch/title — skipping task context')
    return null
  }
  log(`[task-context] issue: #${number}`)

  let issue
  try {
    issue = fetchIssue(number, env.REPO)
  } catch (error) {
    log(`[task-context] cannot load issue #${number}: ${error.message}`)
    return null
  }

  const context = buildIssueContext(issue)
  if (!context) log(`[task-context] issue #${number} has no usable title or body`)
  return context
}
