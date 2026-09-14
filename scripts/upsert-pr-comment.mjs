#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { upsertComment } from './lib/gh-comment.mjs'

const repo = process.env.REPO
const pr = process.env.PR_NUMBER
const marker = process.env.COMMENT_MARKER
const bodyFile = process.env.BODY_FILE || 'report.md'

for (const [key, value] of Object.entries({ REPO: repo, PR_NUMBER: pr, COMMENT_MARKER: marker })) {
  if (!value) {
    console.error(`[upsert-pr-comment] missing required env: ${key}`)
    process.exit(2)
  }
}

const body = readFileSync(bodyFile, 'utf8')
const result = upsertComment({ repo, pr, marker, body })
console.log(`[upsert-pr-comment] comment ${result.action}`)
