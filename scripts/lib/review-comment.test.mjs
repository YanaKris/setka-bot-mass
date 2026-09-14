import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GITHUB_COMMENT_MAX } from './gh-comment.mjs'
import {
  CHECKLIST_HEADING,
  splitChecklist,
  extractHistory,
  appendHistoryEntry,
  composeBody,
  buildPrompt,
} from './review-comment.mjs'

const MARKER = '<!-- claude-auto-review v1 -->'
const TITLE = '## 🤖 Claude auto-review'

test('splitChecklist: separates findings from the checklist', () => {
  const review = `## Critical\n\nБаг.\n\n${CHECKLIST_HEADING}\n\n- [ ] Починить`
  const { reviewBody, checklist } = splitChecklist(review)

  assert.equal(reviewBody, '## Critical\n\nБаг.')
  assert.equal(checklist, `${CHECKLIST_HEADING}\n\n- [ ] Починить`)
})

test('splitChecklist: no checklist heading keeps everything as review body', () => {
  const { reviewBody, checklist } = splitChecklist('## Critical\n\nБаг.')

  assert.equal(reviewBody, '## Critical\n\nБаг.')
  assert.equal(checklist, '')
})

test('extractHistory: reads the block between history markers', () => {
  const body = composeBody({ marker: MARKER, title: TITLE, checklist: '- [ ] a', history: 'старое ревью' })
  assert.equal(extractHistory(body), 'старое ревью')
})

test('extractHistory: returns empty string when there are no markers', () => {
  assert.equal(extractHistory('обычный комментарий'), '')
  assert.equal(extractHistory(undefined), '')
})

test('appendHistoryEntry: first entry has no separator', () => {
  assert.equal(appendHistoryEntry('', 'первая итерация'), 'первая итерация')
})

test('appendHistoryEntry: later entries are separated by a horizontal rule', () => {
  assert.equal(appendHistoryEntry('первая', 'вторая'), 'первая\n\n---\n\nвторая')
})

test('composeBody: marker goes first so the comment can be found again', () => {
  const body = composeBody({ marker: MARKER, title: TITLE, checklist: '- [ ] a', history: 'h' })

  assert.ok(body.startsWith(`${MARKER}\n${TITLE}`))
  assert.ok(body.includes('- [ ] a'))
})

test('composeBody: empty checklist falls back to a placeholder', () => {
  assert.ok(composeBody({ marker: MARKER, title: TITLE, checklist: '', history: 'h' }).includes('чек-лист пуст'))
})

test('composeBody: long history is trimmed but checklist survives', () => {
  const body = composeBody({
    marker: MARKER,
    title: TITLE,
    checklist: '- [ ] важное',
    history: 'z'.repeat(GITHUB_COMMENT_MAX * 2),
  })

  assert.ok(body.length <= GITHUB_COMMENT_MAX)
  assert.ok(body.startsWith(`${MARKER}\n${TITLE}`))
  assert.ok(body.includes('- [ ] важное'))
})

test('buildPrompt: initial review asks for /review and the checklist section', () => {
  const prompt = buildPrompt({ prNumber: '7', repo: 'YanaKris/setka-bot-mass', shortSha: 'abc1234' })

  assert.ok(prompt.includes('/review 7'))
  assert.ok(prompt.includes('YanaKris/setka-bot-mass'))
  assert.ok(prompt.includes('abc1234'))
  assert.ok(prompt.includes(CHECKLIST_HEADING))
  assert.ok(prompt.includes('CLAUDE.md'))
  assert.ok(!prompt.includes('docs/PROJECT.md'))
  assert.ok(!prompt.includes('docs/TASKS.md'))
})

test('buildPrompt: task context is embedded when available', () => {
  const prompt = buildPrompt({
    prNumber: '7',
    repo: 'YanaKris/setka-bot-mass',
    shortSha: 'abc1234',
    taskContext: '## Task context (GitHub issue #7)\n\n### T7. Эндпоинт создания кампании',
  })

  assert.ok(prompt.includes('GitHub issue #7'))
  assert.ok(prompt.includes('acceptance criteria'))
})

test('buildPrompt: follow-up embeds the previous review and status legend', () => {
  const prompt = buildPrompt({
    prNumber: '7',
    repo: 'YanaKris/setka-bot-mass',
    shortSha: 'abc1234',
    previousBody: 'прошлое ревью',
  })

  assert.ok(prompt.includes('прошлое ревью'))
  assert.ok(prompt.includes('FIXED'))
  assert.ok(prompt.includes('STILL OPEN'))
  assert.ok(prompt.includes('CLAUDE.md'))
  assert.ok(!prompt.includes('/review 7'))
})

test('buildPrompt: review language is configurable', () => {
  assert.ok(buildPrompt({ prNumber: '1', repo: 'r', shortSha: 's', language: 'English' }).includes('English'))
})
