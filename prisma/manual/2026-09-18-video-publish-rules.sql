-- 2026-09-18-video-publish-rules.sql — 2026-09-18
--
-- Additive DDL for video publish rule gating: new JSONB column on VideoSource
-- to hold optional, validated rules that can defer the initial `published` state
-- of videos from this source, and a new boolean column on Video to track which
-- ones the sync inserted as drafts because their source's rules rejected them.
--
-- Covers:
--   * VideoSource."publishRules" — optional rule set (title include/exclude phrases,
--     weekday filters in the business's time zone), validated by `publishRulesSchema`
--     in src/lib/validators/videos.ts and evaluated by src/lib/youtube/publish-rules.ts.
--     NULL = no rules. Like `autoPublish`, this decides only `Video.published` at
--     INSERT time; the owner-triggered `videos.reapplyRules` is the one deliberate
--     exception that can rewrite already-published videos.
--   * Video."hiddenByRule" — true when the sync inserted this row as a draft because
--     the source's `publishRules` rejected it (drives the "Hidden by rule" badge in
--     the admin Drafts tab). Sync-seeded at insert, never sync-updated: cleared when
--     the owner publishes the video, rewritten by `videos.reapplyRules`.
--
-- Hand-apply only. Nothing runs this automatically; there is no migration file
-- backing it. Strictly additive — two ADD COLUMN statements, no DROP, no data
-- rewrite, no index change. Safe to run against a live database.
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-09-18-video-publish-rules.sql
--
-- Idempotent: the statements are guarded with IF NOT EXISTS, so a second run
-- is a no-op.
--
-- CHECKLIST: apply this to staging/prod BEFORE deploying the video publish-rules
-- feature. Prisma's generated client selects both columns on every Video read
-- once it ships; against a database missing them, the storefront videos pages,
-- the admin Videos list/form, the sync cron, and the reapplyRules endpoint all
-- throw.
--
-- NOTE: VideoSource."publishRules" is JSONB nullable by design — NULL is the
-- feature-off state (no rules, new videos publish as before). Video."hiddenByRule"
-- is NOT NULL with DEFAULT false by design — this matches what `prisma db push`
-- emits for `Boolean @default(false)`. Existing rows are backfilled to false by
-- the DEFAULT (they predate the feature), which is the correct state: rules are
-- evaluated only for NEW videos from this point forward.

-- ----
-- VideoSource: optional rule set gating new-video `published` state
-- ----

ALTER TABLE "VideoSource" ADD COLUMN IF NOT EXISTS "publishRules" JSONB;

-- ----
-- Video: sync-driven badge tracking which drafts are hidden by rule rejection
-- ----

ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "hiddenByRule" BOOLEAN NOT NULL DEFAULT false;
