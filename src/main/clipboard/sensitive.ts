const SENSITIVE_APPS = ['1password', 'bitwarden', 'lastpass', 'keepass', 'dashlane']

const API_KEY_PATTERNS = [
  /sk-[A-Za-z0-9]{20,}/,
  /ghp_[A-Za-z0-9]{36}/,
  /xox[bp]-[A-Za-z0-9-]+/,
  /AKIA[0-9A-Z]{16}/,
]

const PRIVATE_KEY_PATTERN = /-----BEGIN .* PRIVATE KEY-----/

export function isSensitive(text: string | null, sourceApp: string | null): boolean {
  if (sourceApp && isPasswordManager(sourceApp)) {
    return true
  }

  if (!text) {
    return false
  }

  if (hasCreditCard(text)) {
    return true
  }

  if (API_KEY_PATTERNS.some((p) => p.test(text))) {
    return true
  }

  if (PRIVATE_KEY_PATTERN.test(text)) {
    return true
  }

  return false
}

function isPasswordManager(appName: string): boolean {
  const lower = appName.toLowerCase()
  return SENSITIVE_APPS.some((name) => lower.includes(name))
}

function hasCreditCard(text: string): boolean {
  const digits = text.replace(/[\s-]/g, '')
  if (!/^\d{13,19}$/.test(digits)) {
    return false
  }
  return luhnCheck(digits)
}

function luhnCheck(digits: string): boolean {
  let sum = 0
  let alternate = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i]!, 10)
    if (alternate) {
      n *= 2
      if (n > 9) {
        n -= 9
      }
    }
    sum += n
    alternate = !alternate
  }
  return sum % 10 === 0
}
