import { BrowserWindow } from 'electron'
import { log } from '../logger'

export function broadcastToAll(channel: string, data: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      try {
        window.webContents.send(channel, data)
      } catch (err) {
        log.warn(`Failed to broadcast ${channel}:`, err)
      }
    }
  }
}
