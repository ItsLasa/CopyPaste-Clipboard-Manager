import type { ClipType, CapturePayload } from '@shared/types'

export function detectType(payload: CapturePayload): ClipType {
  if (payload.filePaths && payload.filePaths.length > 0) {
    return 'file'
  }

  if (payload.imageBuffer) {
    return 'image'
  }

  const text = payload.text
  if (!text || text.length === 0) {
    return 'text'
  }

  const trimmed = text.trim()

  if (trimmed.startsWith('<svg') || (trimmed.startsWith('<?xml') && trimmed.includes('<svg'))) {
    return 'svg'
  }

  const firstChar = trimmed[0]
  if ((firstChar === '{' || firstChar === '[') && tryJson(trimmed)) {
    return 'json'
  }

  if (payload.html && text.includes('<') && text.includes('>')) {
    return 'html'
  }

  if (tryUrl(trimmed)) {
    return 'url'
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'email'
  }

  if (
    /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed) ||
    /^(rgb|hsl)a?\(/.test(trimmed)
  ) {
    return 'color'
  }

  if (isCode(trimmed)) {
    return 'code'
  }

  return 'text'
}

function tryJson(text: string): boolean {
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

function tryUrl(text: string): boolean {
  try {
    const url = new URL(text)
    return ['http:', 'https:', 'ftp:', 'file:', 'mailto:'].includes(url.protocol)
  } catch {
    return false
  }
}

const codeKeywords = /\b(function|const|def |class |import |return|if \(|=>)\b/

function isCode(text: string): boolean {
  if (!text.includes('\n') || text.length > 50000) {
    return false
  }

  if (codeKeywords.test(text)) {
    return true
  }

  const hasBraces = text.includes('{') && text.includes('}')
  const hasSemicolons = /;\s*$/m.test(text)

  return hasBraces || hasSemicolons
}
