const OUTPUT_TAIL = 4000

const CREDENTIALS_HINT =
  'у claude нет авторизации. На self-hosted раннере выполните `claude login` под пользователем, от которого работает раннер; альтернатива — задать ANTHROPIC_API_KEY или CLAUDE_CODE_OAUTH_TOKEN в secrets репозитория.'

function tail(text) {
  const trimmed = (text ?? '').trim()
  return trimmed.length > OUTPUT_TAIL ? `…${trimmed.slice(-OUTPUT_TAIL)}` : trimmed
}

export function describeClaudeFailure({ status, stdout, stderr, env = process.env }) {
  const lines = [`[auto-review] claude exited with ${status}`]

  const err = tail(stderr)
  if (err) lines.push(`stderr:\n${err}`)

  const out = tail(stdout)
  if (out) lines.push(`stdout:\n${out}`)

  if (!env.ANTHROPIC_API_KEY && !env.CLAUDE_CODE_OAUTH_TOKEN) lines.push(`hint: ${CREDENTIALS_HINT}`)

  return lines.join('\n')
}
