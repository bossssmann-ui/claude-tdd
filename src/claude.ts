import Anthropic from '@anthropic-ai/sdk'
import { stripFences } from './extract'
import { SYSTEM_PROMPT } from './prompts'
import type { ClaudeMessage, ClaudeResult } from './types'

const MAX_RETRIES = 3

export class AnthropicApiError extends Error {}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status
    if (typeof status === 'number') return status
  }
  return undefined
}

function isLikelyNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return /(network|fetch|econn|timeout|socket|enotfound|eai_again)/i.test(error.message)
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

export async function requestImplementation(input: {
  apiKey: string
  model: string
  silent: boolean
  messages: ClaudeMessage[]
}): Promise<ClaudeResult> {
  const client = new Anthropic({ apiKey: input.apiKey })

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const stream = await client.messages.stream({
        model: input.model,
        max_tokens: 8192,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: input.messages,
      })

      let fullText = ''
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const text = event.delta.text
          fullText += text
          if (!input.silent) {
            process.stdout.write(text)
          }
        }
      }

      return {
        rawText: fullText,
        code: stripFences(fullText),
      }
    } catch (error) {
      const status = getErrorStatus(error)
      const authError = status === 401 || status === 403
      const retryable = status === 429 || isLikelyNetworkError(error)

      if (authError) {
        throw new AnthropicApiError(`Anthropic authentication failed: ${describeError(error)}`)
      }

      if (!retryable || attempt === MAX_RETRIES) {
        throw new AnthropicApiError(`Anthropic request failed: ${describeError(error)}`)
      }

      await sleep(2 ** (attempt - 1) * 1000)
    }
  }

  throw new AnthropicApiError('Anthropic request failed after retries')
}
