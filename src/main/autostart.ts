import { app } from 'electron'
import { log } from './logger'

export function setupAutostart(): void {
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
  })
  log.info('Autostart configured (login item, hidden)')
}
