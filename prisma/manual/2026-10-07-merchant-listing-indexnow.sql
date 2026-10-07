-- 2026-10-07-merchant-listing-indexnow.sql — 2026-10-07
--
-- Adds merchant listing schema fields (delivery times, returns policy) and
-- IndexNow submission watermark to Business. These feed schema.org
-- OfferShippingDetails and MerchantReturnPolicy in product JSON-LD.
--
-- Covers:
--   * Business."handlingDaysMin", "handlingDaysMax", "transitDaysMin",
--     "transitDaysMax" — nullable INTEGER for business-day windows.
--     Both-or-neither (min/max pairs) enforced at app layer.
--   * Business."returnWindowDays" — nullable INTEGER: null = not configured,
--     0 = returns not accepted, N>0 = N-day return window.
--   * Business."returnFees" — nullable TEXT: "free" | "customer_pays" |
--     "flat_fee" (only "flat_fee" uses returnShippingFeeCents).
--   * Business."returnShippingFeeCents" — nullable INTEGER for flat-fee
--     returns (only populated when returnFees = "flat_fee").
--   * Business."returnMethod" — nullable TEXT: "by_mail" | "in_store" |
--     "either" (conveys per-schema.org MerchantReturnPolicy).
--   * Business."indexNowSubmittedAt" and "indexNowHost" — written ONLY via
--     $executeRaw so updatedAt never bumps. Tracks last IndexNow sync point
--     and canonical host to detect re-seeding on domain change.
--
-- No data backfill: all rows land NULL for all new columns.
--
-- `pnpm db:push` produces the same columns; this file is only needed where
-- db:push isn't used. Either way, columns must exist BEFORE deploying the code.
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-10-07-merchant-listing-indexnow.sql
--
-- Idempotent: ADDs are guarded with IF NOT EXISTS.

ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "handlingDaysMin" INTEGER;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "handlingDaysMax" INTEGER;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "transitDaysMin" INTEGER;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "transitDaysMax" INTEGER;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "returnWindowDays" INTEGER;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "returnFees" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "returnShippingFeeCents" INTEGER;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "returnMethod" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "indexNowSubmittedAt" TIMESTAMP(3);
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "indexNowHost" TEXT;
