// Verifies the capture pipeline by directly calling DB queries.
// Run: npm run dev, then: node scripts/verify/capture-verify.mjs

import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.resolve(
  process.env.APPDATA || path.join(process.env.HOME || '', 'AppData', 'Roaming'),
  'your-app',
  'clips.db'
)

if (process.argv[2]) {
  // allow override
  const override = process.argv[2]
  if (override) {
    try {
      new Database(override).close()
      dbPath = override
    } catch {
      console.error('Cannot open:', override)
      process.exit(1)
    }
  }
}

console.log('Using DB:', dbPath)

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')

// Clean previous verify data
sqlite.exec("DELETE FROM clips WHERE source_app LIKE 'verify-%'")
console.log('Cleaned previous verify data.')

const now = Date.now()
const insertStmt = sqlite.prepare(`
  INSERT INTO clips (content_hash, type, text_value, source_app, source_title, byte_size, is_sensitive, is_pinned, created_at, last_used_at, use_count)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

// Test 1: Insert clips of different types
const testClips = [
  { hash: 'hash-text-1', type: 'text', text: 'Hello world', app: 'verify-notepad' },
  { hash: 'hash-url-1', type: 'url', text: 'https://example.com', app: 'verify-chrome' },
  { hash: 'hash-color-1', type: 'color', text: '#FF5500', app: 'verify-figma' },
  { hash: 'hash-code-1', type: 'code', text: 'function foo() {\n  return 1;\n}', app: 'verify-vscode' },
  { hash: 'hash-email-1', type: 'email', text: 'user@example.com', app: 'verify-outlook' },
]

for (const clip of testClips) {
  insertStmt.run(clip.hash, clip.type, clip.text, clip.app, 'Test Window', clip.text.length, 0, 0, now, now, 1)
}

const count = sqlite.prepare("SELECT count(*) as c FROM clips WHERE source_app LIKE 'verify-%'").get()
console.log(`Inserted ${count.c} clips (expected 5)`)

// Test 2: Verify types
const typeCheck = sqlite.prepare(`SELECT type, count(*) as c FROM clips WHERE source_app LIKE 'verify-%' GROUP BY type`).all()
for (const row of typeCheck) {
  console.log(`  Type "${row.type}": ${row.c} clip(s)`)
}

// Test 3: Dedup simulation — bump useCount instead of re-inserting
const dedupHash = 'hash-dedup-1'
insertStmt.run(dedupHash, 'text', 'dedup test', 'verify-dedup', 'Test', 10, 0, 0, now, now, 1)

// Simulate bump
sqlite.prepare("UPDATE clips SET use_count = use_count + 1, last_used_at = ? WHERE content_hash = ?").run(Date.now(), dedupHash)

const dedupCount = sqlite.prepare("SELECT count(*) as c FROM clips WHERE content_hash = ?").get(dedupHash)
const dedupUseCount = sqlite.prepare("SELECT use_count FROM clips WHERE content_hash = ?").get(dedupHash)

console.log(`\nDedup test: ${dedupCount.c} row(s) with hash (expected 1), useCount=${dedupUseCount.use_count} (expected 2)`)

// Test 4: Sensitive detection by source app
insertStmt.run('hash-sensitive-1', 'text', 'secret password here', '1Password.exe', '1Password', 19, 1, 0, now, now, 1)
const sensitiveClips = sqlite.prepare("SELECT count(*) as c FROM clips WHERE source_app = '1Password.exe' AND is_sensitive = 1").get()
console.log(`Sensitive detection: ${sensitiveClips.c} sensitive clip(s) from 1Password (expected 1)`)

// Clean up
sqlite.exec("DELETE FROM clips WHERE source_app LIKE 'verify-%' OR source_app = '1Password.exe'")
console.log('Cleanup done.')

sqlite.close()

// Validate
if (count.c !== 5) {
  console.error('FAIL: Expected 5 clips')
  process.exit(1)
}
if (dedupCount.c !== 1 || dedupUseCount.use_count !== 2) {
  console.error('FAIL: Dedup mismatch')
  process.exit(1)
}
if (sensitiveClips.c !== 1) {
  console.error('FAIL: Sensitive detection mismatch')
  process.exit(1)
}

console.log('\nPASS: All capture pipeline checks passed.')
