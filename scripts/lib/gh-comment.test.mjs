import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GITHUB_COMMENT_MAX, fitToLimit, capBody } from './gh-comment.mjs'

test('fitToLimit: short content is returned untouched', () => {
  const render = (text) => `head\n${text}\ntail`
  assert.equal(fitToLimit(render, 'body'), 'head\nbody\ntail')
})

test('fitToLimit: oversized content is cut to the GitHub limit', () => {
  const render = (text) => `head\n${text}`
  const huge = 'x'.repeat(GITHUB_COMMENT_MAX * 2)
  const result = fitToLimit(render, huge, 'NOTICE\n')

  assert.ok(result.length <= GITHUB_COMMENT_MAX)
  assert.ok(result.startsWith('head\nNOTICE\n'))
})

test('fitToLimit: keeps the tail of the content, not the head', () => {
  const render = (text) => text
  const huge = `${'a'.repeat(GITHUB_COMMENT_MAX)}THE-END`
  assert.ok(fitToLimit(render, huge).endsWith('THE-END'))
})

test('capBody: short body is unchanged', () => {
  assert.equal(capBody('body', '<!-- m -->', '## T'), 'body')
})

test('capBody: oversized body is truncated and marker survives', () => {
  const result = capBody('y'.repeat(GITHUB_COMMENT_MAX + 500), '<!-- m -->', '## T')

  assert.ok(result.length <= GITHUB_COMMENT_MAX)
  assert.ok(result.startsWith('<!-- m -->\n## T'))
  assert.ok(result.includes('обрезан'))
})
