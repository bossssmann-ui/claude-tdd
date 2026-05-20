import { describe, expect, it } from 'bun:test'
import { Fetch } from './fetch'

describe('Fetch component', () => {
  it('is a callable component', () => {
    expect(typeof Fetch).toBe('function')
  })
})
