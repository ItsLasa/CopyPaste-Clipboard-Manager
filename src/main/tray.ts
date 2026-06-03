import { Tray, Menu, nativeImage, BrowserWindow, app, dialog } from 'electron'
import { log } from './logger'
import { showOverlay } from './windows/overlay'

let tray: Tray | null = null
let isPaused = false

export function createTray(iconPath: string, onQuit: () => void): Tray {
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(icon)

  tray.setToolTip('Clipboard Manager — Capturing')

  tray.on('click', () => {
    const windows = BrowserWindow.getAllWindows()
    const libWindow = windows.find((w) => w.title === 'Clipboard')
    if (libWindow) {
      if (libWindow.isVisible()) {
        libWindow.hide()
      } else {
        libWindow.show()
        libWindow.focus()
      }
    }
  })

  updateTrayMenu(onQuit)
  log.info('System tray created')
  return tray
}

export function updateTrayState(paused: boolean): void {
  isPaused = paused
  if (tray) {
    tray.setToolTip(`Clipboard Manager — ${paused ? 'Paused' : 'Capturing'}`)
  }
  const label = isPaused ? '▶ Resume Capture' : '⏸ Pause Capture'
  // menu is rebuilt on click, tooltip is enough
}

function updateTrayMenu(onQuit: () => void): void {
  if (!tray) return

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Library',
      click: () => {
        const windows = BrowserWindow.getAllWindows()
        const libWindow = windows.find((w) => w.title === 'Clipboard')
        if (libWindow) {
          libWindow.show()
          libWindow.focus()
        }
      },
    },
    {
      label: 'Quick Paste',
      click: () => showOverlay(),
    },
    {
      label: 'Settings',
      click: () => {
        try {
          const { createSettingsWindow, getSettingsWindow } = require('./windows/settings')
          const existing = getSettingsWindow()
          if (existing) {
            existing.show()
            existing.focus()
          } else {
            createSettingsWindow()
          }
        } catch {
          log.warn('Settings window not available')
        }
      },
    },
    { type: 'separator' },
    {
      label: 'About',
      click: () => {
        dialog.showMessageBox({
          type: 'info',
          title: 'About Clipboard Manager',
          message: 'Clipboard Manager v1.0.0',
          detail: 'Local-first clipboard history & screenshot manager.',
        })
      },
    },
    { type: 'separator' },
    { label: 'Quit', click: onQuit },
  ])

  tray.setContextMenu(contextMenu)
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
