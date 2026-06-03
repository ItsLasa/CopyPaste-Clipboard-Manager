import { describe, it, expect } from 'vitest'
import { detectType } from '../classify'
import type { CapturePayload } from '@shared/types'

describe('detectType', () => {
  it('classifies file path', () => {
    const p: CapturePayload = { type: 'file', filePaths: ['C:\\test.txt'] }
    expect(detectType(p)).toBe('file')
  })

  it('classifies image', () => {
    const p: CapturePayload = { type: 'image', imageBuffer: Buffer.from([1, 2, 3]) }
    expect(detectType(p)).toBe('image')
  })

  it('classifies svg', () => {
    const p: CapturePayload = { type: 'text', text: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' }
    expect(detectType(p)).toBe('svg')
  })

  it('classifies json', () => {
    const p: CapturePayload = { type: 'text', text: '{"key": "value"}' }
    expect(detectType(p)).toBe('json')
  })

  it('classifies json array', () => {
    const p: CapturePayload = { type: 'text', text: '[1, 2, 3]' }
    expect(detectType(p)).toBe('json')
  })

  it('classifies html', () => {
    const p: CapturePayload = { type: 'text', text: '<div>hello</div>', html: '<div>hello</div>' }
    expect(detectType(p)).toBe('html')
  })

  it('classifies url', () => {
    expect(detectType({ type: 'text', text: 'https://example.com' })).toBe('url')
    expect(detectType({ type: 'text', text: 'http://example.com' })).toBe('url')
    expect(detectType({ type: 'text', text: 'ftp://files.example.com' })).toBe('url')
  })

  it('classifies email', () => {
    expect(detectType({ type: 'text', text: 'user@example.com' })).toBe('email')
  })

  it('classifies hex color', () => {
    expect(detectType({ type: 'text', text: '#FF5500' })).toBe('color')
    expect(detectType({ type: 'text', text: '#abc' })).toBe('color')
  })

  it('classifies rgb color', () => {
    expect(detectType({ type: 'text', text: 'rgb(255, 0, 0)' })).toBe('color')
    expect(detectType({ type: 'text', text: 'hsl(180, 50%, 50%)' })).toBe('color')
  })

  it('classifies code by braces', () => {
    const p: CapturePayload = {
      type: 'text',
      text: 'function foo() {\n  return 1;\n}',
    }
    expect(detectType(p)).toBe('code')
  })

  it('classifies code by keywords', () => {
    const p: CapturePayload = {
      type: 'text',
      text: 'const x = () => {\n  return 1\n}',
    }
    expect(detectType(p)).toBe('code')
  })

  it('classifies plain text as text', () => {
    expect(detectType({ type: 'text', text: 'hello world' })).toBe('text')
  })

  it('classifies empty text as text', () => {
    expect(detectType({ type: 'text', text: '' })).toBe('text')
  })
})
