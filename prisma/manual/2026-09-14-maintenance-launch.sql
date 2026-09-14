-- 2026-09-14-maintenance-launch.sql — 2026-09-14
--
-- Additive DDL for the editable maintenance / coming-soon page (owner-customizable
-- fields for launch announcements and promotional messaging):
-- six new nullable columns on Business.
--
-- Covers:
--   * Business."maintenanceOverline" — short pre-headline text, ≤80 chars;
--     null triggers template default copy
--   * Business."maintenanceHeadline" — main headline, ≤160 chars;
--     null triggers template default copy
--   * Business."maintenanceImage" — public URL from the `image` upload route
--     (typically a flyer or promotional graphic)
--   * Business."maintenanceLaunchAt" — UTC timestamp marking the start of the
--     launch window; entered as wall-clock time in `Business.timeZone`
--   * Business."maintenanceLaunchEndAt" — optional UTC timestamp marking the
--     end of the launch window; must be after `maintenanceLaunchAt` if set
--   * Business."maintenanceLocation" — location text field, ≤200 chars, free text
--
-- Hand-apply only. Nothing runs this automatically; there is no migration
-- file backing it. Strictly additive — six ADD COLUMN, no DROP, no data
-- rewrite, no index change. Safe to run against a live database.
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-09-14-maintenance-launch.sql
--
-- Idempotent: the statements are guarded with IF NOT EXISTS, so a second run
-- is a no-op.
--
-- CHECKLIST: apply this to staging/prod BEFORE deploying the maintenance-launch
-- feature. Prisma's generated client will select these columns on every Business
-- read once it ships; against a database missing them, every storefront route
-- and admin page throw.
--
-- NOTE: all columns nullable with no DEFAULT by design — this matches what
-- `prisma db push` emits for optional String and DateTime fields. Existing rows
-- keep NULL for all six fields (they predate the feature) and the storefront
-- renders template defaults when any field is NULL.

-- ----------------------------------------------------------------------------
-- Business: editable maintenance / launch announcement fields
-- ----------------------------------------------------------------------------

ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "maintenanceOverline" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "maintenanceHeadline" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "maintenanceImage" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "maintenanceLaunchAt" TIMESTAMP(3);
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "maintenanceLaunchEndAt" TIMESTAMP(3);
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "maintenanceLocation" TEXT;
