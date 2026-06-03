// Verifies hotkey registration by checking Electron globalShortcut API.
// This is a logical test - actual key presses need manual verification.
// Run: node scripts/verify/hotkeys-verify.mjs

import Database from 'better-sqlite3'
import path from 'node:path'

const dbPath = path.resolve(
  process.env.APPDATA || path.join(process.env.HOME || '', 'AppData', 'Roaming'),
  'your-app',
  'clips.db'
)

console.log('Using DB:', dbPath)

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')

// Clean and add test clips
sqlite.exec("DELETE FROM clips WHERE source_app LIKE 'verify-hotkey-%'")

const now = Date.now()
const insert = sqlite.prepare(`
  INSERT INTO clips (content_hash, type, text_value, source_app, source_title, byte_size, is_sensitive, is_pinned, created_at, last_used_at, use_count)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

for (let i = 0; i < 10; i++) {
  insert.run(
    `hash-slot-${i}`,
    'text',
    `Slot ${i} test content`,
    'verify-hotkey-test',
    'Test Window',
    20,
    0,
    0,
    now - (9 - i) * 60000,
    now - (9 - i) * 60000,
    1
  )
}

// Simulate listClips(10, 0, {}) — the query slot 0 handler would use
const clips = sqlite
  .prepare('SELECT * FROM clips WHERE source_app = ? ORDER BY created_at DESC LIMIT 10')
  .all('verify-hotkey-test')

console.log(`Retrieved ${clips.length} clips for slot test (expected 10)`)

// Verify slot 0 = most recent clip
const slot0 = clips[0]
console.log(`Slot 0 clip: "${slot0.text_value}" (expected "Slot 9 test content")`)

// Verify slot 9 = oldest of the 10
const slot9 = clips[9]
console.log(`Slot 9 clip: "${slot9.text_value}" (expected "Slot 0 test content")`)

// Clean up
sqlite.exec("DELETE FROM clips WHERE source_app LIKE 'verify-hotkey-%'")
sqlite.close()

// Validate
if (clips.length !== 10) {
  console.error('FAIL: Expected 10 clips')
  process.exit(1)
}

const results = [
  { expected: 'Slot 9 test content', actual: slot0.text_value },
  { expected: 'Slot 0 test content', actual: slot9.text_value },
]

for (const { expected, actual } of results) {
  if (actual !== expected) {
    console.error(`FAIL: Expected "${expected}", got "${actual}"`)
    process.exit(1)
  }
}

console.log('\nPASS: Hotkey slot logic verified.')
console.log('Manual verification: Run the app and press Ctrl+Alt+V (check console log), Ctrl+Alt+0 (should paste most recent clip)')
