import chokidar from 'chokidar'
import path from 'path'
import fs from 'fs'
import { app, nativeImage } from 'electron'
import { log } from '../logger'
import { insertClip } from '../db/queries'
import { broadcastToAll } from '../ipc/events'
import { IPC } from '@shared/ipc-channels'
import crypto from 'crypto'

let watcher: chokidar.FSWatcher | null = null

export function startFileWatcher(): void {
  const screenshotsDir = path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    'Pictures',
    'Screenshots'
  )

  if (!fs.existsSync(screenshotsDir)) {
    log.info(`Screenshots folder not found: ${screenshotsDir}`)
    return
  }

  watcher = chokidar.watch(screenshotsDir, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  })

  watcher.on('add', async (filepath) => {
    try {
      await handleNewScreenshot(filepath)
    } catch (err) {
      log.error('Failed to process screenshot:', err)
    }
  })

  log.info(`Watching screenshots folder: ${screenshotsDir}`)
}

async function handleNewScreenshot(filepath: string): Promise<void> {
  const ext = path.extname(filepath).toLowerCase()
  if (!['.png', '.jpg', '.jpeg', '.bmp'].includes(ext)) return

  const buffer = fs.readFileSync(filepath)
  const contentHash = crypto.createHash('sha256').update(buffer).digest('hex')

  const now = new Date()
  const year = now.getFullYear().toString()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const blobsDir = path.join(app.getPath('userData'), 'blobs', year, month)
  if (!fs.existsSync(blobsDir)) {
    fs.mkdirSync(blobsDir, { recursive: true })
  }

  const filename = `prtscn-${crypto.randomUUID()}${ext}`
  const destPath = path.join(blobsDir, filename)
  fs.copyFileSync(filepath, destPath)

  const nowMs = Date.now()
  const clip = insertClip({
    contentHash,
    type: 'image',
    textValue: null,
    blobPath: path.join('blobs', year, month, filename),
    sourceApp: 'Screenshot',
    sourceTitle: 'Print Screen',
    byteSize: buffer.length,
    isSensitive: false,
    isPinned: false,
    createdAt: nowMs,
    lastUsedAt: nowMs,
    useCount: 1,
  })

  broadcastToAll(IPC.CLIP_ADDED, clip)
  log.info(`Screenshot file watch captured: ${filename}`)
}

export function stopFileWatcher(): void {
  if (watcher) {
    watcher.close()
    watcher = null
    log.info('Screenshot file watcher stopped')
  }
}
