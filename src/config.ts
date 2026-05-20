import type { ResolvedConfig } from './types'

export const DEFAULT_MODEL = 'claude-opus-4-6'

const MODEL_ALIASES: Record<string, string> = {
  opus: 'claude-opus-4-6',
  sonnet: 'claude-sonnet-4-6',
  haiku: 'claude-haiku-4-5-20251001',
}

export function resolveModel(input?: string): string {
  if (!input) return DEFAULT_MODEL
  const normalized = input.trim().toLowerCase()
  return MODEL_ALIASES[normalized] ?? input.trim()
}

export function resolveMaxAttempts(input?: number): number {
  if (input === undefined) return 3
  if (!Number.isInteger(input) || input < 1) {
    throw new Error('--max-attempts must be a positive integer')
  }
  return input
}

export function resolveConfig(input: {
  apiKey?: string
  model?: string
  silent?: boolean
  maxAttempts?: number
}): ResolvedConfig {
  const apiKey = input.apiKey?.trim() || process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('Missing Anthropic API key. Set ANTHROPIC_API_KEY or pass --api-key.')
  }

  return {
    apiKey,
    model: resolveModel(input.model ?? process.env.CLAUDE_TDD_MODEL),
    silent: Boolean(input.silent),
    maxAttempts: resolveMaxAttempts(input.maxAttempts),
  }
}
