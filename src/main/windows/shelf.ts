import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { log } from '../logger'

let shelfWindow: BrowserWindow | null = null

const SHELF_WIDTH = 520
const SHELF_EXPANDED_HEIGHT = 96
const SHELF_COLLAPSED_HEIGHT = 12
const SHELF_TOP_OFFSET = 8

export function createShelfWindow(): BrowserWindow {
  if (shelfWindow && !shelfWindow.isDestroyed()) {
    return shelfWindow
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workArea

  shelfWindow = new BrowserWindow({
    width: SHELF_WIDTH,
    height: SHELF_COLLAPSED_HEIGHT,
    x: Math.round((screenWidth - SHELF_WIDTH) / 2),
    y: SHELF_TOP_OFFSET,
    resizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    show: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
    },
  })

  shelfWindow.setAlwaysOnTop(true, 'screen-saver')

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    shelfWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/shelf/index.html')
  } else {
    shelfWindow.loadFile(join(__dirname, '../renderer/shelf/index.html'))
  }

  shelfWindow.on('closed', () => {
    shelfWindow = null
  })

  shelfWindow.once('ready-to-show', () => {
    shelfWindow?.show()
  })

  log.info('Shelf window created')

  return shelfWindow
}

export function getShelfWindow(): BrowserWindow | null {
  if (shelfWindow && !shelfWindow.isDestroyed()) {
    return shelfWindow
  }
  return null
}
