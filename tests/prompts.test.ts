import { describe, expect, it } from 'bun:test'
import { SYSTEM_PROMPT, buildUserMessage } from '../src/prompts'

describe('SYSTEM_PROMPT', () => {
  it('contains tdd role', () => {
    expect(SYSTEM_PROMPT).toContain('You are a TDD code-writer.')
  })
})

describe('buildUserMessage', () => {
  it('includes context and test sections', () => {
    const message = buildUserMessage(
      { path: 'tests/sum.test.ts', content: "import { sum } from './sum'" },
      [{ path: 'src/types.ts', content: 'export type X = string' }],
    )

    expect(message).toContain('## Context files (existing code, use as reference, do not redefine)')
    expect(message).toContain('### src/types.ts')
    expect(message).toContain('## Test file (your spec)')
    expect(message).toContain('### tests/sum.test.ts')
    expect(message).toContain('Output the implementation code only.')
  })

  it('omits context section when empty', () => {
    const message = buildUserMessage({ path: 'tests/sum.test.ts', content: 'test' }, [])
    expect(message).not.toContain('## Context files')
    expect(message).toContain('## Test file (your spec)')
  })
})
