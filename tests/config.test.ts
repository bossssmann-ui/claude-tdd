import { afterEach, describe, expect, it } from 'bun:test'
import { DEFAULT_MODEL, resolveConfig, resolveMaxAttempts, resolveModel } from '../src/config'

describe('resolveModel', () => {
  it('uses default when missing', () => {
    expect(resolveModel()).toBe(DEFAULT_MODEL)
  })

  it('resolves aliases', () => {
    expect(resolveModel('opus')).toBe('claude-opus-4-6')
    expect(resolveModel('sonnet')).toBe('claude-sonnet-4-6')
    expect(resolveModel('haiku')).toBe('claude-haiku-4-5-20251001')
  })

  it('passes through explicit model', () => {
    expect(resolveModel('claude-sonnet-4-6')).toBe('claude-sonnet-4-6')
  })
})

describe('resolveMaxAttempts', () => {
  it('defaults to 3', () => {
    expect(resolveMaxAttempts()).toBe(3)
  })

  it('throws on non-positive values', () => {
    expect(() => resolveMaxAttempts(0)).toThrow('--max-attempts must be a positive integer')
  })
})

describe('resolveConfig', () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY
  const originalModel = process.env.CLAUDE_TDD_MODEL

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY
    } else {
      process.env.ANTHROPIC_API_KEY = originalApiKey
    }
    if (originalModel === undefined) {
      delete process.env.CLAUDE_TDD_MODEL
    } else {
      process.env.CLAUDE_TDD_MODEL = originalModel
    }
  })

  it('uses env api key when cli key is not provided', () => {
    process.env.ANTHROPIC_API_KEY = 'env-key'
    const cfg = resolveConfig({})
    expect(cfg.apiKey).toBe('env-key')
  })

  it('prefers cli key over env', () => {
    process.env.ANTHROPIC_API_KEY = 'env-key'
    const cfg = resolveConfig({ apiKey: 'cli-key', model: 'sonnet', maxAttempts: 5 })
    expect(cfg.apiKey).toBe('cli-key')
    expect(cfg.model).toBe('claude-sonnet-4-6')
    expect(cfg.maxAttempts).toBe(5)
  })

  it('throws when api key is missing', () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(() => resolveConfig({})).toThrow('Missing Anthropic API key. Set ANTHROPIC_API_KEY or pass --api-key.')
  })

  it('uses CLAUDE_TDD_MODEL when cli model is not provided', () => {
    process.env.ANTHROPIC_API_KEY = 'env-key'
    process.env.CLAUDE_TDD_MODEL = 'haiku'
    const cfg = resolveConfig({})
    expect(cfg.model).toBe('claude-haiku-4-5-20251001')
  })
})
