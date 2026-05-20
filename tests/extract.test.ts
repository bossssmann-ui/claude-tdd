import { describe, expect, it } from 'bun:test'
import { deriveOutputPath, stripFences } from '../src/extract'

describe('stripFences', () => {
  it('strips fences with language', () => {
    expect(stripFences('```ts\nexport const x = 1\n```')).toBe('export const x = 1\n')
  })

  it('strips fences without language', () => {
    expect(stripFences('```\nexport const x = 1\n```')).toBe('export const x = 1\n')
  })

  it('keeps unfenced content', () => {
    expect(stripFences('export const x = 1')).toBe('export const x = 1\n')
  })

  it('trims trailing whitespace', () => {
    expect(stripFences('```ts\nexport const x = 1\n```   \n\n')).toBe('export const x = 1\n')
  })
})

describe('deriveOutputPath', () => {
  it('derives from .test.ts', () => {
    expect(deriveOutputPath('foo.test.ts')).toBe('foo.ts')
  })

  it('derives from .spec.tsx', () => {
    expect(deriveOutputPath('foo.spec.tsx')).toBe('foo.tsx')
  })

  it('derives from .test.js', () => {
    expect(deriveOutputPath('foo.test.js')).toBe('foo.js')
  })

  it('derives nested path with .spec.ts', () => {
    expect(deriveOutputPath('src/components/foo.spec.ts')).toBe('src/components/foo.ts')
  })

  it('derives nested path with .test.tsx', () => {
    expect(deriveOutputPath('src/components/foo.test.tsx')).toBe('src/components/foo.tsx')
  })
})
