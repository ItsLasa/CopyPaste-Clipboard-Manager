import { BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { log } from '../logger'

let settingsWindow: BrowserWindow | null = null

export function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show()
    settingsWindow.focus()
    return settingsWindow
  }

  settingsWindow = new BrowserWindow({
    width: 600,
    height: 700,
    minWidth: 480,
    minHeight: 600,
    resizable: true,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    title: 'Settings',
    autoHideMenuBar: true,
    backgroundColor: '#0E0E10',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
    },
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/settings/index.html')
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/settings/index.html'))
  }

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show()
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  log.info('Settings window created')

  return settingsWindow
}

export function getSettingsWindow(): BrowserWindow | null {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    return settingsWindow
  }
  return null
}
