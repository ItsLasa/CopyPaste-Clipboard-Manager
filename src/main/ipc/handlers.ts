import { ipcMain, clipboard, app, nativeImage } from 'electron'
import path from 'path'
import { IPC } from '@shared/ipc-channels'
import {
  listClips,
  deleteClip,
  pinClip,
  bumpUsage,
  countClips,
  getClipById,
  searchClips,
} from '../db/queries'
import { pauseCapture, resumeCapture, getCaptureState } from '../clipboard/capture-service'
import { hideOverlay } from '../windows/overlay'
import { getSettingsWindow } from '../windows/settings'
import { updateTrayState } from '../tray'
import { getShelfWindow } from '../windows/shelf'
import { loadSettings, getSettings, updateSettings } from '../settings-store'
import { captureRegion, cancelRegionCapture } from '../screenshots/region-capture'
import { activateLicense, isLicensed, getLicenseMasked } from '../license'
import { log } from '../logger'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.CLIPS_QUERY, (_event, params: { limit?: number; offset?: number; type?: string }) => {
    return listClips(params.limit ?? 50, params.offset ?? 0, { type: params.type })
  })

  ipcMain.handle(
    IPC.CLIPS_SEARCH,
    (_event, params: { query: string; limit?: number; type?: string }) => {
      return searchClips(params.query, params.limit ?? 20, { type: params.type })
    }
  )

  ipcMain.handle(IPC.CLIPS_DELETE, (_event, id: number) => {
    const ok = deleteClip(id)
    return { ok }
  })

  ipcMain.handle(IPC.CLIPS_PIN, (_event, id: number, pinned: boolean) => {
    const ok = pinClip(id, pinned)
    return { ok }
  })

  ipcMain.handle(IPC.CLIPS_USE, (_event, id: number) => {
    bumpUsage(id)
    const clip = getClipById(id)
    if (!clip) return { ok: false }

    if (clip.textValue) {
      clipboard.writeText(clip.textValue)
    } else if (clip.blobPath) {
      const img = nativeImage.createFromPath(path.join(app.getPath('userData'), clip.blobPath))
      clipboard.writeImage(img)
    }

    return { ok: true, clip }
  })

  ipcMain.handle(IPC.OVERLAY_SELECT, async (_event, clipId: number) => {
    const clip = getClipById(clipId)
    if (!clip) {
      return { ok: false, error: 'Clip not found' }
    }

    bumpUsage(clipId)

    if (clip.textValue) {
      clipboard.writeText(clip.textValue)
    } else if (clip.blobPath) {
      clipboard.writeImage(nativeImage.createFromPath(path.join(app.getPath('userData'), clip.blobPath)))
    }

    hideOverlay()
    return { ok: true }
  })

  ipcMain.handle(IPC.WINDOW_HIDE, (_event, windowName: string) => {
    if (windowName === 'overlay') {
      hideOverlay()
    } else if (windowName === 'settings') {
      const sw = getSettingsWindow()
      if (sw) sw.hide()
    }
    return { ok: true }
  })

  ipcMain.on(IPC.DRAG_START, (_event, data: { clipId: number; blobPath: string | null }) => {
    if (!data.blobPath) return

    const absolutePath = path.join(app.getPath('userData'), data.blobPath)
    const sender = _event.sender

    sender.startDrag({
      file: absolutePath,
      icon: nativeImage.createFromDataURL(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAACZSURBVHgBpdIxDsIwDAZgO3J37AwcgYGFszB1ZOJKXIWJFVgY4AQMbCwsSEioUqUEW0t+fMmPnTgGADOXG6qrpq7q4lKXxW6/LedFXa4gACPqIcaId34gf+pNhIgQ0qZ0FqIoBqQ4LAXb6D/YzQsJIoU0dlCWNroFgyhI4Vh+0lQKBqGQFnyRRMSiIECTfNQmJxMWkUBFmX0A+aAveLRcyJQAAAAASUVORK5CYII='
      ),
    })
  })

  ipcMain.handle(IPC.CAPTURE_PAUSE, () => {
    pauseCapture()
    updateTrayState(true)
    return { ok: true }
  })

  ipcMain.handle(IPC.CAPTURE_RESUME, () => {
    resumeCapture()
    updateTrayState(false)
    return { ok: true }
  })

  ipcMain.handle('blob:path', (_event, relativePath: string) => {
    return path.join(app.getPath('userData'), relativePath)
  })

  ipcMain.handle(IPC.SETTINGS_GET, () => {
    return getSettings()
  })

  ipcMain.handle(IPC.SETTINGS_SET, (_event, partial: Record<string, unknown>) => {
    const updated = updateSettings(partial as Partial<ReturnType<typeof getSettings>>)
    return updated
  })

  ipcMain.on('screenshot:region', (_event, rect: { x: number; y: number; width: number; height: number }) => {
    captureRegion(rect).catch((err) => log.error('Region capture failed:', err))
  })

  ipcMain.on('screenshot:cancel', () => {
    cancelRegionCapture()
  })

  ipcMain.handle(IPC.LICENSE_STATUS, () => {
    return {
      licensed: isLicensed(),
      licenseKey: getLicenseMasked(),
    }
  })

  ipcMain.handle(IPC.LICENSE_VALIDATE, async (_event, key: string) => {
    const valid = await activateLicense(key)
    return { valid }
  })

  ipcMain.handle('onboarding:complete', () => {
    updateSettings({ hasCompletedOnboarding: true })
    const { closeOnboardingWindow } = require('../windows/onboarding')
    closeOnboardingWindow()
    return { ok: true }
  })

  log.info('IPC handlers registered')
}
