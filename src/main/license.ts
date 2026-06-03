import { safeStorage, app } from 'electron'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { log } from './logger'

const LICENSE_FILE = 'license.enc'
const MOCK_VALID_PREFIX = 'CLIP-'
const MOCK_SECRET = 'MOCK_LICENSE_SECRET_KEY'

let _isLicensed = false

export function isLicensed(): boolean {
  return _isLicensed
}

export function loadLicense(): void {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      log.warn('safeStorage not available — running in free tier')
      _isLicensed = false
      return
    }

    const filePath = path.join(app.getPath('userData'), LICENSE_FILE)
    if (!fs.existsSync(filePath)) {
      _isLicensed = false
      return
    }

    const encrypted = fs.readFileSync(filePath)
    const decrypted = safeStorage.decryptString(encrypted)
    const valid = validateLicenseKey(decrypted)
    _isLicensed = valid
    log.info(`License loaded: ${valid ? 'valid' : 'invalid'}`)
  } catch (err) {
    log.error('Failed to load license:', err)
    _isLicensed = false
  }
}

export function validateLicenseKey(key: string): boolean {
  if (key.startsWith(MOCK_VALID_PREFIX) && key.length >= 20) {
    return true
  }

  // Production: validate against Polar.sh API
  // const response = await fetch('https://api.polar.sh/v1/licenses/validate', { ... })
  return false
}

export async function activateLicense(key: string): Promise<boolean> {
  const valid = validateLicenseKey(key)
  if (!valid) {
    return false
  }

  try {
    if (!safeStorage.isEncryptionAvailable()) {
      log.error('safeStorage not available — cannot persist license')
      return false
    }

    const encrypted = safeStorage.encryptString(key)
    const filePath = path.join(app.getPath('userData'), LICENSE_FILE)
    fs.writeFileSync(filePath, encrypted)

    _isLicensed = true
    log.info('License activated successfully')
    return true
  } catch (err) {
    log.error('Failed to persist license:', err)
    return false
  }
}

export function getLicenseMasked(): string | null {
  try {
    const filePath = path.join(app.getPath('userData'), LICENSE_FILE)
    if (!fs.existsSync(filePath) || !safeStorage.isEncryptionAvailable()) {
      return null
    }

    const encrypted = fs.readFileSync(filePath)
    const decrypted = safeStorage.decryptString(encrypted)
    return decrypted.slice(0, 8) + '••••' + decrypted.slice(-4)
  } catch {
    return null
  }
}
