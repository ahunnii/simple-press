-- 2026-09-25-business-coordinates.sql — 2026-09-25
--
-- Adds optional map-pin coordinates to Business (Settings → General
-- "Address & map pin"). Used for storefront maps and LocalBusiness `geo`
-- when localPresence mode is 'storefront'.
--
-- Covers:
--   * Business."latitude" and Business."longitude" — both nullable DOUBLE PRECISION.
--     Both or neither must be set (enforced at the app layer).
--     Referenced by `business.simplifiedGet`, which selects these columns
--     on every storefront read, so columns MUST exist before code deploy.
--
-- No data backfill: existing rows land NULL for both coordinates.
--
-- `pnpm db:push` produces the same columns; this file is only needed where
-- db:push isn't used. Either way, the columns must exist BEFORE deploying
-- the code — the generated client selects both on every storefront read.
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-09-25-business-coordinates.sql
--
-- Idempotent: ADDs are guarded with IF NOT EXISTS.

ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
