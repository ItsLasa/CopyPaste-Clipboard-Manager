import { eq, desc, and, sql, or } from 'drizzle-orm'
import { getDb, getSqlite } from './client'
import { clips, categories, clipCategories } from './schema'
import type { Clip, Category } from '@shared/types'
import { isLicensed } from '../license'
import { log } from '../logger'

const BATCH_SIZE = 100
const MAX_CLIPS = 5000
const FREE_TIER_LIMIT = 50

function toClip(row: typeof clips.$inferSelect): Clip {
  return {
    ...row,
    isSensitive: Boolean(row.isSensitive),
    isPinned: Boolean(row.isPinned),
  }
}

export function countClips(): number {
  const db = getDb()
  const result = db.select({ count: sql<number>`count(*)` }).from(clips).get()
  return result?.count ?? 0
}

export function insertClip(
  clip: Omit<Clip, 'id' | 'categories'>
): Clip {
  const db = getDb()
  const now = Date.now()

  const rows = db
    .insert(clips)
    .values({
      contentHash: clip.contentHash,
      type: clip.type,
      textValue: clip.textValue,
      blobPath: clip.blobPath,
      sourceApp: clip.sourceApp,
      sourceTitle: clip.sourceTitle,
      byteSize: clip.byteSize,
      isSensitive: clip.isSensitive,
      isPinned: clip.isPinned,
      createdAt: clip.createdAt || now,
      lastUsedAt: clip.lastUsedAt || now,
      useCount: clip.useCount || 0,
    })
    .returning()
    .get()

  if (!rows) {
    throw new Error('Failed to insert clip')
  }

  pruneRetention()

  return toClip(rows)
}

export function findClipByHash(hash: string): Clip | undefined {
  const db = getDb()
  const row = db.select().from(clips).where(eq(clips.contentHash, hash)).get()
  return row ? toClip(row) : undefined
}

export function bumpUsage(id: number): void {
  const db = getDb()
  db.update(clips)
    .set({
      lastUsedAt: Date.now(),
      useCount: sql`use_count + 1`,
    })
    .where(eq(clips.id, id))
    .run()
}

export function deleteClip(id: number): boolean {
  const db = getDb()
  const result = db.delete(clips).where(eq(clips.id, id)).run()
  return result.changes > 0
}

export function pinClip(id: number, pinned: boolean): boolean {
  const db = getDb()
  const result = db
    .update(clips)
    .set({ isPinned: pinned ? 1 : 0 })
    .where(eq(clips.id, id))
    .run()
  return result.changes > 0
}

export function listClips(
  limit = 50,
  offset = 0,
  filters?: { type?: string; app?: string; pinned?: boolean }
): Clip[] {
  if (!isLicensed()) {
    limit = Math.min(limit, FREE_TIER_LIMIT)
    offset = 0
  }

  const db = getDb()
  const conditions = []

  if (filters?.type) {
    conditions.push(eq(clips.type, filters.type))
  }
  if (filters?.app) {
    conditions.push(eq(clips.sourceApp, filters.app))
  }
  if (filters?.pinned !== undefined) {
    conditions.push(eq(clips.isPinned, filters.pinned ? 1 : 0))
  }

  const query = db
    .select()
    .from(clips)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(clips.createdAt))
    .limit(limit)
    .offset(offset)

  return query.all().map(toClip)
}

export function searchClips(
  query: string,
  limit = 50,
  filters?: { type?: string }
): Clip[] {
  const sqlite = getSqlite()

  let ftsWhere = ''
  if (query.trim()) {
    const escaped = query.replace(/'/g, "''")
    ftsWhere = `WHERE clips_fts MATCH '${escaped}'`
  }

  let typeFilter = ''
  if (filters?.type) {
    typeFilter = `AND c.type = '${filters.type.replace(/'/g, "''")}'`
  }

  const rawSql = `
    SELECT c.* FROM clips c
    INNER JOIN clips_fts ON c.id = clips_fts.rowid
    ${ftsWhere}
    ${ftsWhere ? typeFilter : (filters?.type ? `WHERE c.type = '${filters.type.replace(/'/g, "''")}'` : '')}
    ORDER BY c.created_at DESC
    LIMIT ${limit}
  `

  const rows = sqlite.prepare(rawSql).all() as Array<Record<string, unknown>>
  return rows.map((row) => {
    const clipRow = {
      id: Number(row.id),
      contentHash: String(row.content_hash ?? ''),
      type: String(row.type ?? 'text'),
      textValue: row.text_value ? String(row.text_value) : null,
      blobPath: row.blob_path ? String(row.blob_path) : null,
      sourceApp: row.source_app ? String(row.source_app) : null,
      sourceTitle: row.source_title ? String(row.source_title) : null,
      byteSize: Number(row.byte_size ?? 0),
      isSensitive: Boolean(row.is_sensitive),
      isPinned: Boolean(row.is_pinned),
      createdAt: Number(row.created_at ?? 0),
      lastUsedAt: Number(row.last_used_at ?? 0),
      useCount: Number(row.use_count ?? 0),
    }
    return toClip(clipRow)
  })
}

export function pruneRetention(): void {
  const total = countClips()
  if (total <= MAX_CLIPS) return

  const toDelete = total - MAX_CLIPS
  const batches = Math.ceil(toDelete / BATCH_SIZE)

  const sqlite = getSqlite()
  const deleteStmt = sqlite.prepare(`
    DELETE FROM clips WHERE id IN (
      SELECT id FROM clips
      WHERE is_pinned = 0
      ORDER BY created_at ASC
      LIMIT ?
    )
  `)

  for (let i = 0; i < batches; i++) {
    const count = Math.min(BATCH_SIZE, toDelete - i * BATCH_SIZE)
    deleteStmt.run(count)
  }

  log.info(`Retention pruned: ${toDelete} clips removed`)
}

export function getClipById(id: number): Clip | undefined {
  const db = getDb()
  const row = db.select().from(clips).where(eq(clips.id, id)).get()
  return row ? toClip(row) : undefined
}
