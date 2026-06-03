import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { log } from './logger'

export interface AppSettings {
  sensitiveMode: 'mark' | 'skip' | 'store'
  retentionMax: number
  theme: 'system' | 'dark' | 'light'
  licenseKey: string | null
  hotkeys: Record<string, string>
  hasCompletedOnboarding: boolean
}

const defaults: AppSettings = {
  sensitiveMode: 'mark',
  retentionMax: 5000,
  theme: 'system',
  licenseKey: null,
  hotkeys: {},
  hasCompletedOnboarding: false,
}

let settings: AppSettings = { ...defaults }
let settingsPath: string

export function loadSettings(): AppSettings {
  settingsPath = path.join(app.getPath('userData'), 'settings.json')

  try {
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf-8')
      const parsed = JSON.parse(raw)
      settings = { ...defaults, ...parsed }
      log.info('Settings loaded')
    } else {
      settings = { ...defaults }
      saveSettings()
      log.info('Default settings created')
    }
  } catch (err) {
    log.error('Failed to load settings:', err)
    settings = { ...defaults }
  }

  return settings
}

export function getSettings(): AppSettings {
  return { ...settings }
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  settings = { ...settings, ...partial }
  saveSettings()
  return { ...settings }
}

function saveSettings(): void {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
  } catch (err) {
    log.error('Failed to save settings:', err)
  }
}
