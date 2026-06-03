import { BrowserWindow, screen, desktopCapturer, app } from 'electron'
import { join } from 'path'
import fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import { log } from '../logger'
import { insertClip } from '../db/queries'
import { broadcastToAll } from '../ipc/events'
import { IPC } from '@shared/ipc-channels'

let captureWindow: BrowserWindow | null = null

export function startRegionCapture(): void {
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.close()
    captureWindow = null
    return
  }

  const displays = screen.getAllDisplays()
  const { x, y } = screen.getPrimaryDisplay().bounds
  const totalWidth = displays.reduce((w, d) => Math.max(w, d.bounds.x + d.bounds.width), 0)
  const totalHeight = displays.reduce((h, d) => Math.max(h, d.bounds.y + d.bounds.height), 0)

  captureWindow = new BrowserWindow({
    x,
    y,
    width: totalWidth,
    height: totalHeight,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    show: false,
    webPreferences: {
      sandbox: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
    },
  })

  const html = getCaptureHtml()
  captureWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

  captureWindow.on('ready-to-show', () => {
    captureWindow?.show()
    captureWindow?.focus()
  })

  captureWindow.on('closed', () => {
    captureWindow = null
  })

  log.info('Region capture started')
}

function getCaptureHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 100vw; height: 100vh; cursor: crosshair; overflow: hidden; background: rgba(0,0,0,0.2); }
  #overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; }
  #selection { position: fixed; border: 2px solid #7C5CFF; background: rgba(124,92,255,0.12); display: none; }
  #info { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); color: #F5F5F7; font: 12px Inter, sans-serif; background: rgba(14,14,16,0.8); padding: 6px 16px; border-radius: 20px; backdrop-filter: blur(8px); }
</style>
</head>
<body>
  <div id="overlay"></div>
  <div id="selection"></div>
  <div id="info">Click and drag to capture a region · Esc to cancel</div>
  <script>
    const sel = document.getElementById('selection')
    const info = document.getElementById('info')
    let startX = 0, startY = 0, dragging = false

    document.body.addEventListener('mousedown', (e) => {
      dragging = true
      startX = e.screenX
      startY = e.screenY
      sel.style.display = 'block'
      info.style.display = 'none'
    })

    document.body.addEventListener('mousemove', (e) => {
      if (!dragging) return
      const x = Math.min(startX, e.screenX)
      const y = Math.min(startY, e.screenY)
      const w = Math.abs(e.screenX - startX)
      const h = Math.abs(e.screenY - startY)
      sel.style.left = x + 'px'
      sel.style.top = y + 'px'
      sel.style.width = w + 'px'
      sel.style.height = h + 'px'
    })

    document.body.addEventListener('mouseup', (e) => {
      if (!dragging) return
      dragging = false
      const x = Math.min(startX, e.screenX)
      const y = Math.min(startY, e.screenY)
      const w = Math.abs(e.screenX - startX)
      const h = Math.abs(e.screenY - startY)
      if (w > 10 && h > 10) {
        window.api.send('screenshot:region', { x, y, width: w, height: h })
      } else {
        window.api.send('screenshot:cancel')
      }
    })

    document.body.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.api.send('screenshot:cancel')
      }
    })
  </script>
</body>
</html>`
}

export async function captureRegion(
  rect: { x: number; y: number; width: number; height: number }
): Promise<void> {
  if (captureWindow) {
    captureWindow.hide()
  }

  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 3840, height: 2160 },
    })

    const primarySource = sources[0]
    if (!primarySource) {
      log.error('No screen source found')
      return
    }

    const fullImage = primarySource.thumbnail

    const display = screen.getPrimaryDisplay()
    const scaleFactor = fullImage.getSize().width / display.bounds.width

    const cropRect = {
      x: Math.round(rect.x * scaleFactor),
      y: Math.round(rect.y * scaleFactor),
      width: Math.round(rect.width * scaleFactor),
      height: Math.round(rect.height * scaleFactor),
    }

    const cropped = fullImage.crop(cropRect)
    const buffer = cropped.toPNG()

    const now = new Date()
    const year = now.getFullYear().toString()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const blobsDir = path.join(app.getPath('userData'), 'blobs', year, month)
    if (!fs.existsSync(blobsDir)) {
      fs.mkdirSync(blobsDir, { recursive: true })
    }

    const filename = `screenshot-${crypto.randomUUID()}.png`
    const filepath = path.join(blobsDir, filename)
    fs.writeFileSync(filepath, buffer)

    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex')

    const nowMs = Date.now()
    const clip = insertClip({
      contentHash,
      type: 'image',
      textValue: null,
      blobPath: path.join('blobs', year, month, filename),
      sourceApp: 'Screenshot',
      sourceTitle: 'Region Capture',
      byteSize: buffer.length,
      isSensitive: false,
      isPinned: false,
      createdAt: nowMs,
      lastUsedAt: nowMs,
      useCount: 1,
    })

    broadcastToAll(IPC.CLIP_ADDED, clip)
    log.info(`Screenshot captured: ${filepath}`)
  } catch (err) {
    log.error('Screenshot capture failed:', err)
  } finally {
    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.close()
      captureWindow = null
    }
  }
}

export function cancelRegionCapture(): void {
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.close()
    captureWindow = null
  }
  log.info('Region capture cancelled')
}
