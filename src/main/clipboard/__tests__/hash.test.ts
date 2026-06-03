import { describe, it, expect } from 'vitest'
import { computeHash } from '../hash'

describe('computeHash', () => {
  it('produces consistent hash for same text', () => {
    const h1 = computeHash('hello world')
    const h2 = computeHash('hello world')
    expect(h1).toBe(h2)
    expect(h1).toHaveLength(64)
  })

  it('produces different hash for different text', () => {
    const h1 = computeHash('hello')
    const h2 = computeHash('world')
    expect(h1).not.toBe(h2)
  })

  it('produces consistent hash for same buffer', () => {
    const buf = Buffer.from([1, 2, 3, 4, 5])
    const h1 = computeHash(buf)
    const h2 = computeHash(buf)
    expect(h1).toBe(h2)
  })

  it('produces same hash for text and equivalent buffer', () => {
    const h1 = computeHash('test')
    const h2 = computeHash(Buffer.from('test'))
    expect(h1).toBe(h2)
  })
})
