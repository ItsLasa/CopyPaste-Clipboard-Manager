import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { log } from '../logger'

let overlayWindow: BrowserWindow | null = null

export function createOverlayWindow(): BrowserWindow {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow
  }

  const cursorPoint = screen.getCursorScreenPoint()
  const currentDisplay = screen.getDisplayNearestPoint(cursorPoint)
  const { x, y, width, height } = currentDisplay.workArea

  overlayWindow = new BrowserWindow({
    width: 720,
    height: 480,
    x: Math.round(x + (width - 720) / 2),
    y: Math.round(y + (height - 480) / 2),
    resizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    show: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
    },
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/overlay/index.html')
  } else {
    overlayWindow.loadFile(join(__dirname, '../renderer/overlay/index.html'))
  }

  overlayWindow.on('blur', () => {
    hideOverlay()
  })

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })

  log.info('Overlay window created')

  return overlayWindow
}

export function showOverlay(): void {
  const win = createOverlayWindow()
  const cursorPoint = screen.getCursorScreenPoint()
  const currentDisplay = screen.getDisplayNearestPoint(cursorPoint)
  const { x, y, width, height } = currentDisplay.workArea

  win.setBounds({
    x: Math.round(x + (width - 720) / 2),
    y: Math.round(y + (height - 480) / 2),
    width: 720,
    height: 480,
  })

  win.show()
  win.focus()
  win.webContents.send('overlay:shown')
}

export function hideOverlay(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide()
  }
}

export function getOverlayWindow(): BrowserWindow | null {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow
  }
  return null
}
