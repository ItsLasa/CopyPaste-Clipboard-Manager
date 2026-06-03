import crypto from 'crypto'

export function computeHash(text: string): string
export function computeHash(buffer: Buffer): string
export function computeHash(payload: string | Buffer): string {
  if (Buffer.isBuffer(payload)) {
    return crypto.createHash('sha256').update(payload).digest('hex')
  }
  return crypto.createHash('sha256').update(payload, 'utf-8').digest('hex')
}
