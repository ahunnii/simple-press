-- 2026-10-26-local-delivery.sql — 2026-10-26
--
-- Hand-apply record for local delivery (owner-driven delivery within a radius
-- of a ZIP code). For environments that don't use `prisma db push`, this file
-- is the record of what to run; the Prisma schema is the source of truth.
--
-- Covers:
--   * seven "localDelivery*" / "offersLocalDelivery" columns on "Business".
--   * No Order change: "Order"."deliveryMethod" is TEXT and simply gains the
--     value 'delivery' alongside 'ship' | 'pickup'.
--
-- Idempotent: safe to re-run.

ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "offersLocalDelivery" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "localDeliveryOriginZip" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "localDeliveryRadiusMiles" INTEGER;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "localDeliveryFeeCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "localDeliveryMinOrderCents" INTEGER;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "localDeliveryInstructions" TEXT;

-- Distance bands (follow-up, same day): closer prices inside the radius,
-- JSON [{ "upToMiles": 5, "feeCents": 0 }, ...]. NULL = one price for the
-- whole radius (localDeliveryFeeCents).
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "localDeliveryBands" JSONB;
