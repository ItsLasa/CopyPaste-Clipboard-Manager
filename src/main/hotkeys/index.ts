import { globalShortcut, powerMonitor, BrowserWindow } from 'electron'
import { log } from '../logger'
import { listClips } from '../db/queries'
import { pasteText } from './paste-back'
import { showOverlay } from '../windows/overlay'
import { startRegionCapture } from '../screenshots/region-capture'
import { broadcastToAll } from '../ipc/events'

const HOTKEYS = {
  OVERLAY: 'CmdOrCtrl+Alt+V',
  LIBRARY: 'CmdOrCtrl+Alt+L',
  SCREENSHOT: 'CmdOrCtrl+Alt+S',
  SLOTS: Array.from({ length: 10 }, (_, i) => `CmdOrCtrl+Alt+${i}`),
} as const

const SLOT_UNASSIGNED = HOTKEYS.SLOTS

export function registerHotkeys(): void {
  globalShortcut.register(HOTKEYS.OVERLAY, () => {
    log.info('Hotkey: overlay (Ctrl+Alt+V)')
    showOverlay()
  })

  globalShortcut.register(HOTKEYS.LIBRARY, () => {
    log.info('Hotkey: library (Ctrl+Alt+L)')
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

  globalShortcut.register(HOTKEYS.SCREENSHOT, () => {
    log.info('Hotkey: screenshot (Ctrl+Alt+S)')
    startRegionCapture()
  })

  SLOT_UNASSIGNED.forEach((hotkey, index) => {
    globalShortcut.register(hotkey, () => {
      handleSlot(index).catch((err) => {
        log.error(`Slot ${index} paste failed:`, err)
      })
    })
  })

  log.info('Global hotkeys registered')
}

async function handleSlot(index: number): Promise<void> {
  log.info(`Hotkey: slot ${index}`)
  const clips = listClips(10, 0, {})
  const clip = clips[index]
  if (clip) {
    const textToPaste = clip.textValue ?? ''
    if (textToPaste) {
      await pasteText(textToPaste)
      log.info(`Slot ${index}: pasted clip #${clip.id}`)
    }
  }
}

export function unregisterHotkeys(): void {
  globalShortcut.unregisterAll()
  log.info('Global hotkeys unregistered')
}

export function setupPowerMonitorReRegister(): void {
  powerMonitor.on('resume', () => {
    log.info('System resumed, re-registering hotkeys')
    registerHotkeys()
  })
}
