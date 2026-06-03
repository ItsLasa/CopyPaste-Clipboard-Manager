import { app, BrowserWindow, shell, protocol, net } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { log } from './logger'
import { initDb, closeDb } from './db/client'
import { registerIpcHandlers } from './ipc/handlers'
import { ingest } from './clipboard/capture-service'
import { startListening, stopListening } from './clipboard/listener'
import { registerHotkeys, unregisterHotkeys, setupPowerMonitorReRegister } from './hotkeys'
import { createShelfWindow } from './windows/shelf'
import { startFileWatcher, stopFileWatcher } from './screenshots/file-watcher'
import { createTray, destroyTray, updateTrayState } from './tray'
import { setupAutostart } from './autostart'
import { loadSettings, getSettings } from './settings-store'
import { loadLicense } from './license'
import { createOnboardingWindow } from './windows/onboarding'
import icon from '../../resources/icon.png?asset'

// Crash reporter — log all unhandled errors
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error)
})

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason)
})

let libraryWindow: BrowserWindow | null = null
let isQuitting = false

function createLibraryWindow(): void {
  libraryWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    title: 'Clipboard',
    autoHideMenuBar: true,
    backgroundColor: '#0E0E10',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
    },
  })

  if (process.platform === 'win32') {
    libraryWindow.setBackgroundMaterial('acrylic')
  }

  libraryWindow.on('ready-to-show', () => {
    libraryWindow?.show()
  })

  libraryWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      libraryWindow?.hide()
    }
  })

  libraryWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    libraryWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/library/index.html')
  } else {
    libraryWindow.loadFile(join(__dirname, '../renderer/library/index.html'))
  }

  log.info('Library window created')
}

function quitApp(): void {
  isQuitting = true
  app.quit()
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'blob-file', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } },
])

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.clipboard.app')

  loadSettings()
  loadLicense()
  initDb()

  protocol.handle('blob-file', (request) => {
    const url = request.url.replace('blob-file://', '')
    const filePath = join(app.getPath('userData'), 'blobs', url)
    return net.fetch(`file:///${filePath.replace(/\\/g, '/')}`)
  })

  registerIpcHandlers()

  registerHotkeys()
  setupPowerMonitorReRegister()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  startListening(() => {
    ingest().catch((err) => {
      log.error('Capture ingest failed:', err)
    })
  })

  createLibraryWindow()
  createShelfWindow()
  startFileWatcher()

  const settings = getSettings()
  if (!settings.hasCompletedOnboarding) {
    createOnboardingWindow()
  }

  const iconPath = join(app.getAppPath(), 'resources', 'icon.png')
  createTray(iconPath, quitApp)

  setupAutostart()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createLibraryWindow()
    } else {
      libraryWindow?.show()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopFileWatcher()
  destroyTray()
  unregisterHotkeys()
  stopListening()
  closeDb()
})
