import { EventEmitter } from 'events'
import { clipboard, nativeImage } from 'electron'
import { log } from '../logger'

type ClipboardHandler = () => void

const POLL_INTERVAL_MS = 750
const emitter = new EventEmitter()
let interval: ReturnType<typeof setInterval> | null = null
let lastText = ''
let lastImageDataUrl = ''

export function startListening(onChange: ClipboardHandler): void {
  let nativeStarted = false

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('clipboard-event')
    const listener = mod.default ?? mod
    listener.on('change', onChange)
    nativeStarted = true
    log.info('Clipboard listener started (native event)')
  } catch (err) {
    log.warn('clipboard-event failed, falling back to polling:', err)
  }

  // always run polling as safety net (catches events the native listener might miss)
  startPolling(onChange, nativeStarted ? 2000 : 750)
}

function startPolling(onChange: ClipboardHandler, intervalMs = POLL_INTERVAL_MS): void {
  // clear existing interval if re-registering
  if (interval) clearInterval(interval)

  interval = setInterval(() => {
    const currentText = clipboard.readText()
    const currentImage = clipboard.readImage()

    let changed = false

    if (currentText !== lastText) {
      lastText = currentText
      changed = true
    }

    if (!currentImage.isEmpty()) {
      const dataUrl = currentImage.toDataURL()
      if (dataUrl !== lastImageDataUrl) {
        lastImageDataUrl = dataUrl
        changed = true
      }
    }

    if (changed) {
      onChange()
    }
  }, intervalMs)

  log.info(`Clipboard polling started (${intervalMs}ms)`)
}

export function readClipboardFormats(): {
  text: string | null
  html: string | null
  image: Electron.NativeImage
  filePaths: string[]
} {
  const formats = clipboard.availableFormats('clipboard')
  log.info(`Clipboard formats: ${formats.join(', ') || '(none)'}`)

  // try multiple ways to read image
  let image: Electron.NativeImage = clipboard.readImage()
  if (image.isEmpty() && formats.some((f) => f.startsWith('image/'))) {
    // some images may need explicit format read
    const buf = clipboard.readBuffer(formats.find((f) => f.startsWith('image/'))!)
    if (buf?.length) {
      image = nativeImage.createFromBuffer(buf)
    }
  }

  const filePaths: string[] = []

  // Windows file copy via readBookmark
  try {
    const bookmark = clipboard.readBookmark()
    if (bookmark && bookmark.url) {
      const url = bookmark.url.replace('file:///', '').replace(/\//g, '\\')
      filePaths.push(decodeURI(url))
    }
  } catch {
    // readBookmark may throw if no bookmark on clipboard
  }

  // fallback: try text/uri-list
  if (filePaths.length === 0) {
    try {
      const uriList = clipboard.read('text/uri-list')
      if (uriList && typeof uriList === 'string' && uriList.trim()) {
        for (const line of uriList.split(/[\r\n]+/)) {
          const trimmed = line.trim()
          if (trimmed.startsWith('file://')) {
            filePaths.push(decodeURI(trimmed.replace('file:///', '').replace(/\//g, '\\')))
          }
        }
      }
    } catch {
      // some formats may not be readable
    }
  }

  // fallback: try FileNameW raw buffer
  if (filePaths.length === 0) {
    try {
      const raw = clipboard.readBuffer('FileNameW')
      if (raw?.length) {
        const str = raw.toString('utf16le').replace(/\0+$/, '')
        const lines = str.split('\0')
        for (const line of lines) {
          const p = line.trim()
          if (p && p.length > 2) filePaths.push(p)
        }
      }
    } catch {
      // may not be available
    }
  }

  return {
    text: clipboard.readText() || null,
    html: clipboard.readHTML() || null,
    image,
    filePaths,
  }
}

export function writeToClipboard(text: string): void {
  clipboard.writeText(text)
}

export function writeImageToClipboard(path: string): void {
  const img = nativeImage.createFromPath(path)
  clipboard.writeImage(img)
}

export function stopListening(): void {
  if (interval) {
    clearInterval(interval)
    interval = null
  }
  emitter.removeAllListeners()
}
