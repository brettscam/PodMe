const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-5-20250514'

interface ClaudeOptions {
  maxTokens?: number
  webSearch?: boolean
}

/**
 * Call the Anthropic Messages API.
 *
 * When webSearch is true, the `web_search` server-side tool is attached,
 * allowing Claude to search the web during generation.
 */
export async function callClaude(
  prompt: string,
  options: ClaudeOptions = {},
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')

  const { maxTokens = 4096, webSearch = false } = options

  const body: Record<string, unknown> = {
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  }

  if (webSearch) {
    body.tools = [
      { type: 'web_search_20250305', name: 'web_search', max_uses: 3 },
    ]
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Claude API error ${response.status}: ${errBody}`)
  }

  const data = await response.json()

  // Extract text from content blocks (may contain tool_use and text blocks)
  const textBlocks = (data.content || []).filter(
    (block: { type: string }) => block.type === 'text',
  )

  if (textBlocks.length === 0) {
    throw new Error('Claude returned no text content')
  }

  return textBlocks.map((b: { text: string }) => b.text).join('\n')
}
