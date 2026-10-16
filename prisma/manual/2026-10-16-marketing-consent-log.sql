-- 2026-10-16-marketing-consent-log.sql — 2026-10-16
--
-- Additive DDL for the email-marketing consent evidence log and the per-store
-- do-not-email list.
--
-- Covers:
--   * MarketingConsentEvent — append-only log of consent transitions.
--     type: OPT_IN | OPT_OUT | SUPPRESSED | UNSUPPRESSED. source: CHECKOUT |
--     NEWSLETTER_FORM | ACCOUNT | RESUBSCRIBE_LINK | LEGACY_ACCOUNT |
--     UNSUBSCRIBE_LINK | ONE_CLICK | OWNER | COMPLAINT | HARD_BOUNCE |
--     PROVIDER_SUPPRESSED. "ip" and "userAgent" hold prisma-field-encryption
--     ciphertext (`/// @encrypted`), never plaintext. customerId / campaignId
--     are SET NULL on delete; businessId cascades.
--   * MarketingDoNotEmail — one row per (store, email hash). "emailHash" is the
--     hex HMAC-SHA256 of the normalized address under the "dne:v1" context
--     (src/lib/marketing/do-not-email.ts); the address itself is never stored.
--     reason: UNSUBSCRIBED | HARD_BOUNCE | COMPLAINT | PROVIDER_SUPPRESSED.
--
-- Hand-apply only. Nothing runs this automatically; there is no migration file
-- backing it. Strictly additive — two CREATE TABLE statements with their
-- indexes and foreign keys; no DROP, no data changes. Safe on a live database.
-- The statements below match `prisma migrate diff` output for these models
-- (column types, index names, constraint names, ON DELETE / ON UPDATE).
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-10-16-marketing-consent-log.sql
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, and the
-- foreign keys are wrapped in DO blocks that check pg_constraint first, so a
-- second run is a no-op.
--
-- Depends on 2026-10-16-email-marketing-v2.sql (the "MarketingCampaign" table
-- referenced by MarketingConsentEvent.campaignId). Apply that one first.
--
-- CHECKLIST: apply to staging/prod BEFORE deploying any code that writes
-- consent events or reads the do-not-email list — on a database missing these
-- tables, those paths throw against tables Prisma's generated client believes
-- exist.

-- ----------------------------------------------------------------------------
-- MarketingConsentEvent (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: MarketingConsentEvent
CREATE TABLE IF NOT EXISTS "MarketingConsentEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "wording" TEXT,
    "campaignId" TEXT,

    CONSTRAINT "MarketingConsentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: a customer's consent history within a store (newest last)
CREATE INDEX IF NOT EXISTS "MarketingConsentEvent_businessId_customerId_createdAt_idx" ON "MarketingConsentEvent"("businessId", "customerId", "createdAt");

-- CreateIndex: SetNull fan-out on customer delete
CREATE INDEX IF NOT EXISTS "MarketingConsentEvent_customerId_idx" ON "MarketingConsentEvent"("customerId");

-- CreateIndex: SetNull fan-out on campaign delete
CREATE INDEX IF NOT EXISTS "MarketingConsentEvent_campaignId_idx" ON "MarketingConsentEvent"("campaignId");

-- ----------------------------------------------------------------------------
-- MarketingDoNotEmail (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: MarketingDoNotEmail
CREATE TABLE IF NOT EXISTS "MarketingDoNotEmail" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessId" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "MarketingDoNotEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: one row per (store, email hash) — the lookup + upsert key
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingDoNotEmail_businessId_emailHash_key" ON "MarketingDoNotEmail"("businessId", "emailHash");

-- ----------------------------------------------------------------------------
-- Foreign keys
-- ----------------------------------------------------------------------------

-- AddForeignKey: MarketingConsentEvent -> Business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MarketingConsentEvent_businessId_fkey'
  ) THEN
    ALTER TABLE "MarketingConsentEvent" ADD CONSTRAINT "MarketingConsentEvent_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: MarketingConsentEvent -> Customer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MarketingConsentEvent_customerId_fkey'
  ) THEN
    ALTER TABLE "MarketingConsentEvent" ADD CONSTRAINT "MarketingConsentEvent_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: MarketingConsentEvent -> MarketingCampaign
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MarketingConsentEvent_campaignId_fkey'
  ) THEN
    ALTER TABLE "MarketingConsentEvent" ADD CONSTRAINT "MarketingConsentEvent_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: MarketingDoNotEmail -> Business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MarketingDoNotEmail_businessId_fkey'
  ) THEN
    ALTER TABLE "MarketingDoNotEmail" ADD CONSTRAINT "MarketingDoNotEmail_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
