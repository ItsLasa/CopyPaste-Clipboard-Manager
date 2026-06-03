import log from 'electron-log'
import path from 'path'
import { app } from 'electron'

log.transports.file.resolvePathFn = () =>
  path.join(app.getPath('userData'), 'logs', 'main.log')
log.transports.file.maxSize = 5 * 1024 * 1024
log.transports.file.maxFiles = 7

export { log }
