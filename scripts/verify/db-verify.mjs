// Verify script: inserts 10 fake clips and searches them via FTS5.
// Run: node scripts/verify/db-verify.mjs <path-to-clips.db>

import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

const dbPath = process.argv[2]
if (!dbPath) {
  console.error('Usage: node scripts/verify/db-verify.mjs <path-to-clips.db>')
  process.exit(1)
}

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found at: ${dbPath}`)
  process.exit(1)
}

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

console.log('Connected to:', dbPath)

// Check tables
const tables = sqlite
  .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  .all()
console.log(
  'Tables:',
  tables.map((t) => t.name).join(', ')
)

// Clean existing test data
sqlite.exec("DELETE FROM clips WHERE source_app = 'verify-script'")

// Insert 10 test clips
const now = Date.now()
const insert = sqlite.prepare(`
  INSERT INTO clips (content_hash, type, text_value, source_app, source_title, byte_size, created_at, last_used_at, use_count)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

for (let i = 1; i <= 10; i++) {
  insert.run(
    `hash-verify-${i}`,
    i <= 3 ? 'text' : i <= 6 ? 'url' : 'code',
    `Test clip number ${i}: ${'lorem ipsum '.repeat(i).trim()}`,
    'verify-script',
    `Test Window ${i}`,
    100 * i,
    now - (10 - i) * 60000,
    now - (10 - i) * 60000,
    i
  )
}

console.log('Inserted 10 test clips.')

// Verify count
const count = sqlite.prepare('SELECT count(*) as c FROM clips WHERE source_app = ?').get('verify-script')
console.log('Count by source_app:', count.c, '(expected 10)')

// Test FTS5 search
const search = sqlite.prepare(`
  SELECT c.id, c.type, c.text_value FROM clips c
  INNER JOIN clips_fts ON c.id = clips_fts.rowid
  WHERE clips_fts MATCH ?
  ORDER BY c.created_at DESC
`)

const results1 = search.all('clip')
console.log(`FTS search for "clip": ${results1.length} results (expected 10)`)

const results2 = search.all('lorem')
console.log(`FTS search for "lorem": ${results2.length} results (expected 10)`)

const results3 = search.all('ipsum')
console.log(`FTS search for "ipsum": ${results3.length} results (expected 10)`)

// Clean up test data
sqlite.exec("DELETE FROM clips WHERE source_app = 'verify-script'")
console.log('Test data cleaned up.')

sqlite.close()

// Validate
if (count.c !== 10) {
  console.error('FAIL: Count mismatch')
  process.exit(1)
}
if (results1.length !== 10 || results2.length !== 10 || results3.length !== 10) {
  console.error('FAIL: FTS5 search mismatch')
  process.exit(1)
}

console.log('\nPASS: All checks passed.')
