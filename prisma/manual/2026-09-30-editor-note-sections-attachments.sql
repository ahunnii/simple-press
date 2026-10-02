-- 2026-09-30-editor-note-sections-attachments.sql — 2026-09-30
--
-- Editor notes (visual editor -> platform operator inbox) gain a section scope
-- and up to 3 image attachments.
--
-- Covers:
--   * EditorNote."sectionKey"     — nullable TEXT. Section id such as
--     "homepage.hero" / "global.header" (matches data-sp-group). NULL for
--     whole-site and whole-page notes.
--   * EditorNote."sectionLabel"   — nullable TEXT. Display snapshot ("Hero")
--     so the note still reads correctly if the section is later renamed.
--   * EditorNote."attachmentUrls" — TEXT[] NOT NULL DEFAULT '{}'. Public
--     storage URLs under {businessId}/editor-notes/, at most 3 (enforced in
--     the editorNote.create router, not in the database).
--
-- No data backfill: existing notes land with NULL section fields and an empty
-- attachment list, which renders exactly as before.
--
-- `pnpm db:push` produces the same columns; this file is only needed where
-- db:push isn't used. Either way, the columns must exist BEFORE deploying
-- the code — the generated client selects them on every note read.
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-09-30-editor-note-sections-attachments.sql
--
-- Idempotent: ADDs are guarded with IF NOT EXISTS.

ALTER TABLE "EditorNote" ADD COLUMN IF NOT EXISTS "sectionKey" TEXT;
ALTER TABLE "EditorNote" ADD COLUMN IF NOT EXISTS "sectionLabel" TEXT;
ALTER TABLE "EditorNote" ADD COLUMN IF NOT EXISTS "attachmentUrls" TEXT[] NOT NULL DEFAULT '{}';
