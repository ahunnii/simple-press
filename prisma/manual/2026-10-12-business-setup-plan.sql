-- 2026-10-12-business-setup-plan.sql — 2026-10-12
--
-- Business-type setup checklists. The platform admin picks a business type
-- (products | services | informational | donations) when creating a store;
-- the type pre-fills which setup steps are required / optional / off.
--
-- Covers:
--   * Business."businessType"       — nullable TEXT. NULL = legacy store, which
--     keeps the original 5-step checklist (no behaviour change for live stores).
--   * Business."setupSteps"         — nullable JSONB, Record<step, level>.
--   * Business."setupConfirmations" — JSONB NOT NULL DEFAULT '{}',
--     Record<step, ISO date> for manually checked-off steps.
--   * Business."setupCompletedAt"   — nullable TIMESTAMP(3). Launch latch:
--     stamped the first time every required step is done; once set, the
--     setup gate (/admin → Setup Guide, sidebar nudge) never re-fires.
--
-- No data backfill: existing rows land NULL / '{}' = legacy checklist. Live
-- stores that already pass the gate get setupCompletedAt stamped by the app
-- on their next admin load (see loadSetupStatus).
--
-- `pnpm db:push` produces the same columns; this file is only needed where
-- db:push isn't used. The columns must exist BEFORE deploying the code — the
-- admin layout reads them on every admin page load.
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-10-12-business-setup-plan.sql
--
-- Idempotent: ADDs are guarded with IF NOT EXISTS.

ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "businessType" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "setupSteps" JSONB;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "setupConfirmations" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "setupCompletedAt" TIMESTAMP(3);
