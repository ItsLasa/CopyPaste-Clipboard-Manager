import { BrowserWindow, app, clipboard, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { readClipboardFormats } from './listener'
import { computeHash } from './hash'
import { detectType } from './classify'
import { isSensitive } from './sensitive'
import { insertClip, findClipByHash, bumpUsage } from '../db/queries'
import { log } from '../logger'
import { IPC } from '@shared/ipc-channels'
import type { Clip, CapturePayload } from '@shared/types'

let lastInsertedHash: string | null = null
let isPaused = false

export function getCaptureState(): boolean {
  return !isPaused
}

export function pauseCapture(): void {
  isPaused = true
  broadcastEvent(IPC.CAPTURE_STATE, { paused: true })
}

export function resumeCapture(): void {
  isPaused = false
  broadcastEvent(IPC.CAPTURE_STATE, { paused: false })
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function ingest(): Promise<Clip | null> {
  if (isPaused) {
    return null
  }

  // let clipboard settle after event fires
  await sleep(50)

  const formats = readClipboardFormats()
  let sourceApp: string | null = null
  let sourceTitle: string | null = null

  try {
    const activeWin = require('active-win')
    const window = await activeWin()
    if (window) {
      sourceApp = window.owner?.name ?? window.name ?? null
      sourceTitle = window.title ?? null
    }
  } catch (err) {
    log.warn('Failed to get active window:', err)
  }

  const payload = buildPayload(formats)
  if (!payload) {
    log.debug('Ingest skipped: empty clipboard')
    return null
  }

  log.info(`Captured: type=${payload.type} src=${sourceApp ?? 'unknown'}`)

  const hash = computeHashForPayload(payload)

  if (hash === lastInsertedHash) {
    const existing = findClipByHash(hash)
    if (existing) {
      bumpUsage(existing.id)
      return null
    }
  }
  lastInsertedHash = hash

  const type = detectType(payload)
  const sensitive = isSensitive(payload.text ?? null, sourceApp)

  if (sensitive) {
    log.info('Sensitive content detected, marking clip')
  }

  let blobPath: string | null = null
  let byteSize = (payload.text ?? '').length

  if (payload.imageBuffer) {
    blobPath = writeBlob('png', payload.imageBuffer)
    byteSize = payload.imageBuffer.length
  }

  const now = Date.now()
  const clip = insertClip({
    contentHash: hash,
    type,
    textValue: payload.text ?? null,
    blobPath,
    sourceApp,
    sourceTitle,
    byteSize,
    isSensitive: sensitive,
    isPinned: false,
    createdAt: now,
    lastUsedAt: now,
    useCount: 1,
  })

  broadcastEvent(IPC.CLIP_ADDED, clip)

  return clip
}

function buildPayload(formats: ReturnType<typeof readClipboardFormats>): CapturePayload | null {
  if (formats.filePaths.length > 0) {
    const names = formats.filePaths.map((p) => p.split('\\').pop() ?? p)
    return { type: 'file', filePaths: formats.filePaths, text: names.join(', ') }
  }

  const image = formats.image

  if (!image.isEmpty()) {
    const buffer = image.toPNG()
    if (buffer.length > 0) {
      return { type: 'image', imageBuffer: buffer }
    }
  }

  const html = formats.html
  let text = formats.text

  if (!text && html) {
    text = stripHtml(html).trim()
  }

  if (text) {
    const trimmed = text.trim()
    if (trimmed.length === 0) {
      return null
    }
    return { type: 'text', text: trimmed, html: html ?? undefined }
  }

  return null
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/\s+/g, ' ')
}

function computeHashForPayload(payload: CapturePayload): string {
  if (payload.imageBuffer) {
    return computeHash(payload.imageBuffer)
  }
  return computeHash(payload.text ?? '')
}

function writeBlob(ext: string, buffer: Buffer): string {
  const now = new Date()
  const year = now.getFullYear().toString()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const dir = path.join(app.getPath('userData'), 'blobs', year, month)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const filename = `${crypto.randomUUID()}.${ext}`
  const filepath = path.join(dir, filename)
  fs.writeFileSync(filepath, buffer)

  return path.join('blobs', year, month, filename)
}

function broadcastEvent(channel: string, data: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, data)
    }
  }
}
