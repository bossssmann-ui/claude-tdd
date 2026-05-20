import { writeFile } from 'node:fs/promises'
import { requestImplementation } from './claude'
import type { ClaudeMessage } from './types'

export class IterateExhaustedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IterateExhaustedError'
  }
}

function formatFailureMessage(output: string): string {
  return `The test still fails. Output of \`bun test\`:\n\n\`\`\`\n${output}\n\`\`\`\n\nPlease return a corrected implementation only.`
}

function runTest(testFilePath: string): { exitCode: number; output: string } {
  const proc = Bun.spawnSync(['bun', 'test', testFilePath], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const decoder = new TextDecoder()
  const stdout = decoder.decode(proc.stdout)
  const stderr = decoder.decode(proc.stderr)
  return {
    exitCode: proc.exitCode,
    output: `${stdout}${stderr}`.trim(),
  }
}

export async function runIterateMode(input: {
  apiKey: string
  model: string
  silent: boolean
  maxAttempts: number
  testFilePath: string
  outputPath: string
  initialUserMessage: string
}): Promise<string> {
  const messages: ClaudeMessage[] = [{ role: 'user', content: input.initialUserMessage }]

  for (let attempt = 1; attempt <= input.maxAttempts; attempt += 1) {
    if (!input.silent) {
      process.stdout.write(`\n\n[attempt ${attempt}/${input.maxAttempts}]\n`)
    }

    const response = await requestImplementation({
      apiKey: input.apiKey,
      model: input.model,
      silent: input.silent,
      messages,
    })

    await writeFile(input.outputPath, response.code, 'utf8')

    const testResult = runTest(input.testFilePath)
    if (testResult.exitCode === 0) {
      process.stdout.write(`\n✓ tests passed (attempt ${attempt})\n`)
      return response.code
    }

    messages.push(
      { role: 'assistant', content: response.rawText },
      { role: 'user', content: formatFailureMessage(testResult.output) },
    )
  }

  throw new IterateExhaustedError(`Reached max attempts (${input.maxAttempts}) without passing tests.`)
}
