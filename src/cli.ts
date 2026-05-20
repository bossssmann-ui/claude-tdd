#!/usr/bin/env bun
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { requestImplementation, AnthropicApiError } from './claude'
import { resolveConfig } from './config'
import { deriveOutputPath } from './extract'
import { runIterateMode, IterateExhaustedError } from './iterate'
import { buildUserMessage } from './prompts'
import type { CliOptions } from './types'

class UsageError extends Error {}

const EXIT_CODES = {
  OK: 0,
  USAGE: 1,
  IO: 2,
  API: 3,
  ITERATE_EXHAUSTED: 4,
} as const

function usage(): string {
  return `Usage: claude-tdd <test-file> [options]

Options:
  --out <path>           Explicit output file path
  --model <id>           Anthropic model id (aliases: opus, sonnet, haiku)
  --context <path>       Additional context file (repeatable)
  --iterate              Run bun test and retry up to --max-attempts
  --max-attempts <n>     Maximum attempts with --iterate (default: 3)
  --dry-run              Print generated implementation instead of writing file
  --silent               Suppress streaming output
  --api-key <key>        Anthropic API key override
  --help, -h             Show this help
  --version, -v          Show version`
}

async function readVersion(): Promise<string> {
  const pkgRaw = await readFile(join(import.meta.dir, '..', 'package.json'), 'utf8')
  const pkg = JSON.parse(pkgRaw) as { version?: string }
  return pkg.version ?? '0.0.0'
}

function parseArgs(argv: string[]): CliOptions | { help: true } | { version: true } {
  if (argv.includes('--help') || argv.includes('-h')) return { help: true }
  if (argv.includes('--version') || argv.includes('-v')) return { version: true }

  const contextPaths: string[] = []
  const positional: string[] = []

  const options: Omit<CliOptions, 'testFilePath' | 'contextPaths'> & { testFilePath?: string; contextPaths: string[] } = {
    contextPaths,
    iterate: false,
    dryRun: false,
    silent: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (!arg.startsWith('-')) {
      positional.push(arg)
      continue
    }

    const next = argv[i + 1]
    switch (arg) {
      case '--out':
        if (!next || next.startsWith('-')) throw new UsageError('--out requires a path')
        options.outPath = next
        i += 1
        break
      case '--model':
        if (!next || next.startsWith('-')) throw new UsageError('--model requires a value')
        options.model = next
        i += 1
        break
      case '--context':
        if (!next || next.startsWith('-')) throw new UsageError('--context requires a path')
        contextPaths.push(next)
        i += 1
        break
      case '--iterate':
        options.iterate = true
        break
      case '--max-attempts':
        if (!next || next.startsWith('-')) throw new UsageError('--max-attempts requires a number')
        options.maxAttempts = Number.parseInt(next, 10)
        i += 1
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--silent':
        options.silent = true
        break
      case '--api-key':
        if (!next || next.startsWith('-')) throw new UsageError('--api-key requires a value')
        options.apiKey = next
        i += 1
        break
      default:
        throw new UsageError(`Unknown option: ${arg}`)
    }
  }

  if (positional.length !== 1) {
    throw new UsageError('Exactly one <test-file> positional argument is required')
  }

  options.testFilePath = positional[0]
  if (options.iterate && options.dryRun) {
    throw new UsageError('--dry-run cannot be combined with --iterate')
  }

  return options as CliOptions
}

async function run(): Promise<number> {
  let parsed: CliOptions | { help: true } | { version: true }
  try {
    parsed = parseArgs(Bun.argv.slice(2))
  } catch (error) {
    if (error instanceof UsageError) {
      process.stderr.write(`${error.message}\n\n${usage()}\n`)
      return EXIT_CODES.USAGE
    }
    throw error
  }

  if ('help' in parsed) {
    process.stdout.write(`${usage()}\n`)
    return EXIT_CODES.OK
  }

  if ('version' in parsed) {
    process.stdout.write(`${await readVersion()}\n`)
    return EXIT_CODES.OK
  }

  let testContent: string
  try {
    testContent = await readFile(parsed.testFilePath, 'utf8')
  } catch (error) {
    process.stderr.write(`Failed to read test file: ${String(error)}\n`)
    return EXIT_CODES.IO
  }

  const contextFiles: Array<{ path: string; content: string }> = []
  try {
    for (const contextPath of parsed.contextPaths) {
      contextFiles.push({
        path: contextPath,
        content: await readFile(contextPath, 'utf8'),
      })
    }
  } catch (error) {
    process.stderr.write(`Failed to read context file: ${String(error)}\n`)
    return EXIT_CODES.IO
  }

  let config
  try {
    config = resolveConfig({
      apiKey: parsed.apiKey,
      model: parsed.model,
      silent: parsed.silent,
      maxAttempts: parsed.maxAttempts,
    })
  } catch (error) {
    process.stderr.write(`${String((error as Error).message)}\n`)
    return EXIT_CODES.USAGE
  }

  const outputPath = parsed.outPath ?? deriveOutputPath(parsed.testFilePath)
  const initialUserMessage = buildUserMessage(
    { path: parsed.testFilePath, content: testContent },
    contextFiles,
  )

  try {
    if (parsed.iterate) {
      await runIterateMode({
        apiKey: config.apiKey,
        model: config.model,
        silent: config.silent,
        maxAttempts: config.maxAttempts,
        testFilePath: parsed.testFilePath,
        outputPath,
        initialUserMessage,
      })
      return EXIT_CODES.OK
    }

    const response = await requestImplementation({
      apiKey: config.apiKey,
      model: config.model,
      silent: config.silent,
      messages: [{ role: 'user', content: initialUserMessage }],
    })

    if (parsed.dryRun) {
      process.stdout.write(response.code)
      return EXIT_CODES.OK
    }

    await writeFile(outputPath, response.code, 'utf8')
    return EXIT_CODES.OK
  } catch (error) {
    if (error instanceof IterateExhaustedError) {
      process.stderr.write(`${error.message}\n`)
      return EXIT_CODES.ITERATE_EXHAUSTED
    }
    if (error instanceof AnthropicApiError) {
      process.stderr.write(`${error.message}\n`)
      return EXIT_CODES.API
    }
    process.stderr.write(`Unexpected error: ${String(error)}\n`)
    return EXIT_CODES.IO
  }
}

const exitCode = await run()
process.exit(exitCode)
