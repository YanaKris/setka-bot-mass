import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractIssueNumber, buildIssueContext, resolveTaskContext } from './issue-context.mjs'

test('extractIssueNumber: closing keyword in PR body wins', () => {
  assert.equal(extractIssueNumber({ prBody: 'Что сделано\n\nCloses #7', headRef: 'main', prTitle: 'no ref' }), 7)
})

test('extractIssueNumber: every closing keyword form is recognised', () => {
  for (const keyword of ['close', 'closes', 'closed', 'fix', 'fixes', 'fixed', 'resolve', 'resolves', 'resolved']) {
    assert.equal(extractIssueNumber({ prBody: `${keyword} #12` }), 12, keyword)
  }
})

test('extractIssueNumber: branch prefix is used when the body has no reference', () => {
  assert.equal(extractIssueNumber({ prBody: 'без ссылок', headRef: '7-create-campaign' }), 7)
})

test('extractIssueNumber: branch prefix works behind a namespace', () => {
  assert.equal(extractIssueNumber({ headRef: 'feat/7-create-campaign' }), 7)
})

test('extractIssueNumber: PR title is the last resort', () => {
  assert.equal(extractIssueNumber({ headRef: 'create-campaign', prTitle: 'Создание кампании (#7)' }), 7)
})

test('extractIssueNumber: body beats branch, branch beats title', () => {
  assert.equal(extractIssueNumber({ prBody: 'Closes #1', headRef: '2-x', prTitle: '#3' }), 1)
  assert.equal(extractIssueNumber({ prBody: 'без ссылок', headRef: '2-x', prTitle: '#3' }), 2)
})

test('extractIssueNumber: bare #N in the body without a keyword is ignored', () => {
  assert.equal(extractIssueNumber({ prBody: 'см. обсуждение в #9' }), null)
})

test('extractIssueNumber: nothing anywhere', () => {
  assert.equal(extractIssueNumber({ prBody: 'правки README', headRef: 'fix-readme', prTitle: 'Правки' }), null)
})

test('extractIssueNumber: no arguments', () => {
  assert.equal(extractIssueNumber(), null)
})

const ISSUE = {
  number: 7,
  title: 'T7. Эндпоинт создания кампании',
  body: '**Цель:** принять форму и сохранить кампанию.\n\n**Критерии приёмки:**\n- роут тонкий',
}

test('buildIssueContext: heading, title and body end up in the context', () => {
  const context = buildIssueContext(ISSUE)

  assert.ok(context.includes('## Task context (GitHub issue #7)'))
  assert.ok(context.includes('### T7. Эндпоинт создания кампании'))
  assert.ok(context.includes('Критерии приёмки'))
})

test('buildIssueContext: issue with an empty body keeps the title', () => {
  const context = buildIssueContext({ number: 3, title: 'T3. Модели БД', body: '' })

  assert.ok(context.includes('### T3. Модели БД'))
})

test('buildIssueContext: nothing usable returns null', () => {
  assert.equal(buildIssueContext({ number: 3, title: '', body: '   ' }), null)
  assert.equal(buildIssueContext(), null)
})

test('resolveTaskContext: loads the issue referenced by the branch', () => {
  const calls = []
  const context = resolveTaskContext({
    env: { HEAD_REF: '7-create-campaign', REPO: 'YanaKris/setka-bot-mass' },
    fetchIssue: (number, repo) => {
      calls.push([number, repo])
      return ISSUE
    },
  })

  assert.deepEqual(calls, [[7, 'YanaKris/setka-bot-mass']])
  assert.ok(context.includes('T7. Эндпоинт создания кампании'))
})

test('resolveTaskContext: no issue reference means no context and no fetch', () => {
  let called = false
  const context = resolveTaskContext({
    env: { HEAD_REF: 'fix-readme', REPO: 'r' },
    fetchIssue: () => {
      called = true
      return ISSUE
    },
  })

  assert.equal(context, null)
  assert.equal(called, false)
})

test('resolveTaskContext: a failing fetch degrades to no context', () => {
  const logged = []
  const context = resolveTaskContext({
    env: { HEAD_REF: '99-missing', REPO: 'r' },
    log: (message) => logged.push(message),
    fetchIssue: () => {
      throw new Error('gh issue view 99 failed (exit 1)')
    },
  })

  assert.equal(context, null)
  assert.ok(logged.some((line) => line.includes('#99')))
})
