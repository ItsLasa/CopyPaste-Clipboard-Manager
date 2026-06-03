import { BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { log } from '../logger'

let onboardingWindow: BrowserWindow | null = null

export function createOnboardingWindow(): BrowserWindow {
  if (onboardingWindow && !onboardingWindow.isDestroyed()) {
    onboardingWindow.show()
    onboardingWindow.focus()
    return onboardingWindow
  }

  onboardingWindow = new BrowserWindow({
    width: 520,
    height: 480,
    resizable: false,
    frame: false,
    transparent: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0E0E10',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
    },
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    onboardingWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/onboarding/index.html')
  } else {
    onboardingWindow.loadFile(join(__dirname, '../renderer/onboarding/index.html'))
  }

  onboardingWindow.once('ready-to-show', () => {
    onboardingWindow?.center()
    onboardingWindow?.show()
  })

  onboardingWindow.on('closed', () => {
    onboardingWindow = null
  })

  log.info('Onboarding window created')
  return onboardingWindow
}

export function closeOnboardingWindow(): void {
  if (onboardingWindow && !onboardingWindow.isDestroyed()) {
    onboardingWindow.close()
    onboardingWindow = null
  }
}
