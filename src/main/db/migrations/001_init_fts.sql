CREATE INDEX IF NOT EXISTS idx_clips_created ON clips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clips_type    ON clips(type);
CREATE INDEX IF NOT EXISTS idx_clips_app     ON clips(source_app);
CREATE INDEX IF NOT EXISTS idx_clips_hash    ON clips(content_hash);

CREATE VIRTUAL TABLE IF NOT EXISTS clips_fts USING fts5(
  text_value, source_app, source_title,
  content='clips', content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS clips_ai AFTER INSERT ON clips BEGIN
  INSERT INTO clips_fts(rowid, text_value, source_app, source_title)
  VALUES (new.id, new.text_value, new.source_app, new.source_title);
END;

CREATE TRIGGER IF NOT EXISTS clips_ad AFTER DELETE ON clips BEGIN
  INSERT INTO clips_fts(clips_fts, rowid, text_value, source_app, source_title)
  VALUES('delete', old.id, old.text_value, old.source_app, old.source_title);
END;

CREATE TRIGGER IF NOT EXISTS clips_au AFTER UPDATE ON clips BEGIN
  INSERT INTO clips_fts(clips_fts, rowid, text_value, source_app, source_title)
  VALUES('delete', old.id, old.text_value, old.source_app, old.source_title);
  INSERT INTO clips_fts(rowid, text_value, source_app, source_title)
  VALUES (new.id, new.text_value, new.source_app, new.source_title);
END;
