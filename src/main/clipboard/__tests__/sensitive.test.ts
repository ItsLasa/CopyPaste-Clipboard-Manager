import { describe, it, expect } from 'vitest'
import { isSensitive } from '../sensitive'

describe('isSensitive', () => {
  it('flags password manager source app', () => {
    expect(isSensitive('any text', '1Password.exe')).toBe(true)
    expect(isSensitive('any text', 'bitwarden.exe')).toBe(true)
    expect(isSensitive('any text', 'LastPass.exe')).toBe(true)
    expect(isSensitive('any text', 'KeePass.exe')).toBe(true)
    expect(isSensitive('any text', 'dashlane.exe')).toBe(true)
  })

  it('does not flag normal app', () => {
    expect(isSensitive('any text', 'notepad.exe')).toBe(false)
    expect(isSensitive('any text', 'chrome.exe')).toBe(false)
  })

  it('matches password manager substring', () => {
    expect(isSensitive('secret', '/Applications/1Password 7.app/Contents/MacOS/1Password')).toBe(true)
  })

  it('flags OpenAI API key pattern', () => {
    expect(isSensitive('sk-abcdefghijklmnopqrstuvwxyz1234567890abcdefghij', null)).toBe(true)
  })

  it('flags GitHub personal access token', () => {
    expect(isSensitive('ghp_abcdefghijklmnopqrstuvwxyz12345678901234', null)).toBe(true)
  })

  it('flags AWS access key', () => {
    expect(isSensitive('AKIA1234567890ABCDEF', null)).toBe(true)
  })

  it('flags private key', () => {
    expect(isSensitive('-----BEGIN RSA PRIVATE KEY-----', null)).toBe(true)
  })

  it('does not flag normal text', () => {
    expect(isSensitive('hello world', null)).toBe(false)
  })

  it('does not flag short sk- pattern', () => {
    expect(isSensitive('sk-short', null)).toBe(false)
  })

  it('flags valid Luhn credit card number', () => {
    expect(isSensitive('4532015112830366', null)).toBe(true)
  })

  it('does not flag invalid Luhn credit card', () => {
    expect(isSensitive('4532015112830367', null)).toBe(false)
  })

  it('returns false for null text and null app', () => {
    expect(isSensitive(null, null)).toBe(false)
  })
})
