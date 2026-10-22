-- 2026-10-22-email-marketing-design.sql — 2026-10-22
--
-- Hand-apply record for the email marketing design pass. Adds the marketing
-- email style on SiteContent, and the segment definition plus scheduled send
-- time on MarketingCampaign. For environments that don't use `prisma db push`,
-- this file is the record of what to run; the Prisma schema is the source of
-- truth.
--
-- Covers:
--   * "SiteContent"."emailStyle" (JSONB, nullable) — matches the Prisma field
--     emailStyle on model SiteContent. Null = template default. Validated by
--     src/lib/marketing/email-style.ts.
--   * "MarketingCampaign"."audience" (JSONB, nullable) — matches the Prisma
--     field audience on model MarketingCampaign. Null = all opted-in customers.
--     Segment shape: src/lib/marketing/segments.ts.
--   * "MarketingCampaign"."scheduledAt" (TIMESTAMP(3), nullable) — matches the
--     Prisma field scheduledAt. Set while status = SCHEDULED; the cron sweep
--     queues the campaign when it is due.
--   * "MarketingCampaign_status_scheduledAt_idx" on ("status", "scheduledAt")
--     — matches @@index([status, scheduledAt]) on model MarketingCampaign.
--
-- Neither model has an @@map, so the table names are the model names. The
-- DateTime column type is TIMESTAMP(3), matching the other DateTime columns.
--
-- Strictly additive — three ADD COLUMN and one CREATE INDEX; no DROP, no
-- UPDATE. Safe to run against a live database.
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-10-22-email-marketing-design.sql
--
-- Idempotent: safe to re-run. Every statement is guarded with
-- ADD COLUMN IF NOT EXISTS or CREATE INDEX IF NOT EXISTS.

ALTER TABLE "SiteContent" ADD COLUMN IF NOT EXISTS "emailStyle" JSONB;
ALTER TABLE "MarketingCampaign" ADD COLUMN IF NOT EXISTS "audience" JSONB;
ALTER TABLE "MarketingCampaign" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "MarketingCampaign_status_scheduledAt_idx"
  ON "MarketingCampaign" ("status", "scheduledAt");
