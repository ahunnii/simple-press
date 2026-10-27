-- 2026-10-26-contact-import.sql — 2026-10-26
--
-- Additive DDL for contact imports (e.g. a Wix contacts export during a store
-- move) and the one-time re-permission invite campaign.
--
-- Covers:
--   * CustomerImport — one row per uploaded contact list. Platform-admin-only
--     to create. "counts" is JSON; "attestationWording"/"attestedAt"/
--     "attestedById" are set when the invite is queued.
--   * "Customer"."importId" — set only on customers CREATED by an import
--     (SET NULL on import delete). "importStatus" (subscribed | unsubscribed |
--     unknown) records what the old site said; only "subscribed" rows are
--     invited. Added in a second push the same day.
--   * "MarketingCampaign"."kind" (STANDARD | REPERMISSION, default STANDARD,
--     so every existing campaign stays STANDARD) and "importId" (UNIQUE: one
--     invite per import; SET NULL on import delete).
--   * No new consent tables. New string values only: consent source
--     IMPORT_CONFIRM (Customer.marketingConsentSource + consent events) and
--     consent-event source IMPORT.
--
-- Hand-apply only. Strictly additive — no DROP, no data changes. Matches
-- `prisma migrate diff` output for these models.
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-10-26-contact-import.sql
--
-- Idempotent: IF NOT EXISTS everywhere; foreign keys are guarded by
-- pg_constraint checks.
--
-- Depends on 2026-10-16-email-marketing-v2.sql ("MarketingCampaign").
--
-- CHECKLIST: apply to prod BEFORE deploying code that reads Customer.importId
-- or MarketingCampaign.kind — the campaign worker selects "kind" on every send.

CREATE TABLE IF NOT EXISTS "CustomerImport" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessId" TEXT NOT NULL,
    "createdById" TEXT,
    "fileName" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL DEFAULT 'CSV',
    "counts" JSONB,
    "attestationWording" TEXT,
    "attestedAt" TIMESTAMP(3),
    "attestedById" TEXT,

    CONSTRAINT "CustomerImport_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "importId" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "importStatus" TEXT;
ALTER TABLE "MarketingCampaign" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "MarketingCampaign" ADD COLUMN IF NOT EXISTS "importId" TEXT;

CREATE INDEX IF NOT EXISTS "CustomerImport_businessId_createdAt_idx" ON "CustomerImport"("businessId", "createdAt");
CREATE INDEX IF NOT EXISTS "Customer_businessId_importId_idx" ON "Customer"("businessId", "importId");
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingCampaign_importId_key" ON "MarketingCampaign"("importId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Customer_importId_fkey') THEN
    ALTER TABLE "Customer" ADD CONSTRAINT "Customer_importId_fkey" FOREIGN KEY ("importId") REFERENCES "CustomerImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketingCampaign_importId_fkey') THEN
    ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_importId_fkey" FOREIGN KEY ("importId") REFERENCES "CustomerImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerImport_businessId_fkey') THEN
    ALTER TABLE "CustomerImport" ADD CONSTRAINT "CustomerImport_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerImport_createdById_fkey') THEN
    ALTER TABLE "CustomerImport" ADD CONSTRAINT "CustomerImport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
