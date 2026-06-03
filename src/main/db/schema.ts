import { sqliteTable, integer, text, primaryKey } from 'drizzle-orm/sqlite-core'

export const clips = sqliteTable('clips', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contentHash: text('content_hash').notNull(),
  type: text('type').notNull(),
  textValue: text('text_value'),
  blobPath: text('blob_path'),
  sourceApp: text('source_app'),
  sourceTitle: text('source_title'),
  byteSize: integer('byte_size').notNull().default(0),
  isSensitive: integer('is_sensitive', { mode: 'boolean' }).notNull().default(false),
  isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  lastUsedAt: integer('last_used_at').notNull(),
  useCount: integer('use_count').notNull().default(0),
})

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const clipCategories = sqliteTable(
  'clip_categories',
  {
    clipId: integer('clip_id').notNull(),
    categoryId: integer('category_id').notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.clipId, t.categoryId] }) })
)
