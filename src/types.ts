export type ClaudeRole = 'user' | 'assistant'

export interface FileInput {
  path: string
  content: string
}

export interface CliOptions {
  testFilePath: string
  outPath?: string
  model?: string
  contextPaths: string[]
  iterate: boolean
  maxAttempts?: number
  dryRun: boolean
  silent: boolean
  apiKey?: string
}

export interface ResolvedConfig {
  apiKey: string
  model: string
  silent: boolean
  maxAttempts: number
}

export interface ClaudeMessage {
  role: ClaudeRole
  content: string
}

export interface ClaudeResult {
  rawText: string
  code: string
}
