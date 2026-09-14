import { fitToLimit } from './gh-comment.mjs'

export const CHECKLIST_HEADING = '## ✅ Чек-лист для разработчика'

const HISTORY_START = '<!-- auto-review:history:start -->'
const HISTORY_END = '<!-- auto-review:history:end -->'
const HISTORY_TRIM_NOTICE = '> _(старые итерации ревью обрезаны до лимита GitHub)_\n\n'

export function splitChecklist(review) {
  const idx = review.indexOf(CHECKLIST_HEADING)
  if (idx === -1) return { reviewBody: review.trim(), checklist: '' }
  return { reviewBody: review.slice(0, idx).trim(), checklist: review.slice(idx).trim() }
}

export function extractHistory(commentBody) {
  if (!commentBody) return ''
  const start = commentBody.indexOf(HISTORY_START)
  const end = commentBody.indexOf(HISTORY_END)
  if (start === -1 || end === -1 || end < start) return ''
  return commentBody.slice(start + HISTORY_START.length, end).trim()
}

export function appendHistoryEntry(history, entry) {
  return history ? `${history}\n\n---\n\n${entry}` : entry
}

export function composeBody({ marker, title, checklist, history }) {
  const shell = (text) =>
    [marker, title, '', checklist || '_(чек-лист пуст)_', '', HISTORY_START, '', text, '', HISTORY_END].join('\n')
  return fitToLimit(shell, history, HISTORY_TRIM_NOTICE)
}

function taskContextBlock(taskContext) {
  if (!taskContext) return []
  return [
    'Use the task requirements below to judge whether the PR actually fulfils them.',
    'Flag missing requirements and acceptance criteria, not just code-level issues.',
    '',
    taskContext,
    '',
    '---',
    '',
  ]
}

const STANDARDS_HINT =
  'Read CLAUDE.md in the repository root («Стандарты разработки») and flag every violation of the conventions it documents: TDD, layering api → services → repositories/clients/queue (services must not import FastAPI/httpx/aio-pika), SOLID (SRP, DIP via Protocol), DRY, coverage thresholds, bearer_token never logged or returned by the API.'

const NO_ISOLATION_HINT =
  'Do NOT review the diff in isolation: open and read the existing code the diff imports from or sits next to, so you can spot pattern violations that are only visible against the rest of the repo — e.g. added code that DUPLICATES existing functionality or introduces a second source of truth for the same thing. The diff alone is not enough.'

function initialPrompt({ prNumber, repo, shortSha, taskContext, language }) {
  return [
    ...taskContextBlock(taskContext),
    `Run \`/review ${prNumber}\` for repository ${repo}.`,
    `Current commit: ${shortSha}.`,
    '',
    'Output requirements:',
    `- Write the ENTIRE review in ${language} (headings, prose, everything). Keep code identifiers, file paths and CLI commands verbatim.`,
    '- Pure markdown. No preamble, no "Here is your review" sentences.',
    '- Sections: Critical, High, Medium, Minor (omit sections with no findings).',
    '- For each finding: file path, line number when applicable, what is wrong, suggested fix.',
    '- Focus on correctness, security, performance, and project conventions.',
    '- Call out requirements from the task context that the PR does not address.',
    `- ${STANDARDS_HINT}`,
    `- ${NO_ISOLATION_HINT}`,
    '',
    `After the findings, ALWAYS append a final section titled "${CHECKLIST_HEADING}".`,
    'It is an actionable, copy-paste-ready checklist of GitHub task items the author must address before merge:',
    '- One `- [ ]` item per concrete action, derived from your findings above, unmet acceptance criteria from the linked GitHub issue, and the standards in CLAUDE.md (tests written before code, coverage ≥ 85% overall and ≥ 90% for services/clients/repositories, no secrets or tokens in logs, docs updated).',
    '- Order items by severity (Critical → Minor). Keep each item short, specific, and verifiable.',
    '- If there is genuinely nothing to do, output a single checked item: `- [x] Замечаний нет — PR готов к мержу`.',
  ].join('\n')
}

function followUpPrompt({ prNumber, repo, shortSha, previousBody, taskContext, language }) {
  return [
    ...taskContextBlock(taskContext),
    `Follow-up review on PR #${prNumber} in ${repo} at commit ${shortSha}.`,
    '',
    'PREVIOUS REVIEW (your earlier comments on this PR, full markdown):',
    '```markdown',
    previousBody,
    '```',
    '',
    'For THIS iteration:',
    `1. Run \`gh pr diff ${prNumber}\` to inspect the current diff. ${NO_ISOLATION_HINT}`,
    '2. For every previously reported issue, output one bullet with status:',
    '   - ✅ FIXED — short note on what changed',
    '   - ⚠️ STILL OPEN — still needs fix',
    '   - 🟡 PARTIAL — partial fix, what is missing',
    `3. List any newly introduced issues at the current commit under "🆕 New". ${STANDARDS_HINT}`,
    `4. End with a section "${CHECKLIST_HEADING}" — a fresh \`- [ ]\` checklist of what STILL needs to be done at this commit (open + partial + new findings, plus unmet standards from CLAUDE.md: tests, coverage ≥ 85%, no tokens in logs, docs). Mark already-resolved items as \`- [x]\`. If nothing is left, output \`- [x] Все замечания закрыты — PR готов к мержу\`.`,
    '5. Output ONLY the new section content (no marker, no top-level title).',
    '6. Be tight. Do not re-paste the previous review.',
    `7. Write the entire output in ${language}. Keep code identifiers, file paths and CLI commands verbatim.`,
  ].join('\n')
}

export function buildPrompt({ prNumber, repo, shortSha, previousBody = '', taskContext = '', language = 'Russian' }) {
  const params = { prNumber, repo, shortSha, previousBody, taskContext, language }
  return previousBody ? followUpPrompt(params) : initialPrompt(params)
}
