-- 2026-10-16-email-marketing-v2.sql — 2026-10-16
--
-- Additive DDL for email marketing v2: consent evidence + suppression columns
-- on Customer, and three new tables for owner-authored campaigns, their Resend
-- batches, and per-recipient delivery state.
--
-- Covers:
--   * Customer — five nullable columns: marketingConsentAt,
--     marketingConsentSource (CHECKOUT | NEWSLETTER_FORM | ACCOUNT |
--     RESUBSCRIBE_LINK | LEGACY_ACCOUNT), marketingUnsubscribedAt,
--     marketingSuppressedAt + marketingSuppressionReason (HARD_BOUNCE |
--     COMPLAINT | PROVIDER_SUPPRESSED; suppressed customers are excluded from
--     all marketing sends). `acceptsMarketing` stays the live opt-in switch.
--   * MarketingCampaign — one row per campaign (subject, body, status, and the
--     rendered HTML/text frozen at queue time so every retry sends
--     byte-identical payloads for Resend idempotency).
--   * MarketingCampaignBatch — one row per Resend batch of a campaign
--     (lease/retry bookkeeping), unique per (campaignId, batchIndex).
--   * MarketingCampaignRecipient — one row per recipient, snapshotting the
--     email at queue time (blanked on customer anonymize); resendId is unique
--     so webhooks can map events back to a recipient.
--   * Backfill — customers who already opted in via the account preferences
--     toggle get marketingConsentSource = 'LEGACY_ACCOUNT'.
--
-- Hand-apply only. Nothing runs this automatically; there is no migration file
-- backing it. Strictly additive — one ALTER TABLE ADD COLUMN, three CREATE
-- TABLE statements with their indexes, and one UPDATE that only fills a NULL
-- column; no DROP. Safe to run against a live database.
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-10-16-email-marketing-v2.sql
--
-- Idempotent: the statements are guarded with ADD COLUMN IF NOT EXISTS,
-- CREATE TABLE IF NOT EXISTS and CREATE INDEX IF NOT EXISTS, the foreign keys
-- are wrapped in DO blocks that check pg_constraint first, and the backfill
-- only touches rows whose source is still NULL, so a second run is a no-op.
--
-- CHECKLIST: apply this to staging/prod BEFORE deploying the email marketing
-- v2 feature. The campaign composer, sender cron, Resend webhook, and the
-- consent/unsubscribe paths all read/write these columns and tables — on a
-- database missing them, every one of those paths throws against columns
-- Prisma's generated client believes exist.
--
-- NOTE: "updatedAt" columns have no DEFAULT by design — this matches what
-- `prisma db push` emits for `@updatedAt` fields: the Prisma client sets the
-- value on every create/update. Status columns are plain TEXT (no enum), like
-- Form/FormSubmission.

-- ----------------------------------------------------------------------------
-- Customer (new columns)
-- ----------------------------------------------------------------------------

-- AlterTable: Customer — marketing consent evidence + suppression
ALTER TABLE "Customer"
    ADD COLUMN IF NOT EXISTS "marketingConsentAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "marketingConsentSource" TEXT,
    ADD COLUMN IF NOT EXISTS "marketingSuppressedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "marketingSuppressionReason" TEXT,
    ADD COLUMN IF NOT EXISTS "marketingUnsubscribedAt" TIMESTAMP(3);

-- ----------------------------------------------------------------------------
-- MarketingCampaign (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: MarketingCampaign
-- Owner-authored campaign. status: DRAFT | QUEUED | SENDING | SENT | FAILED | CANCELED.
-- renderedHtml contains the __SP_UNSUBSCRIBE_URL__ placeholder, substituted per recipient.
CREATE TABLE IF NOT EXISTS "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "contentFormat" TEXT NOT NULL DEFAULT 'text',
    "bodyText" TEXT,
    "bodyJson" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "renderedHtml" TEXT,
    "renderedText" TEXT,
    "fromAddress" TEXT,
    "replyTo" TEXT,
    "baseUrl" TEXT,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "queuedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "lastError" TEXT,

    "businessId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: admin campaign list (newest first)
CREATE INDEX IF NOT EXISTS "MarketingCampaign_businessId_createdAt_idx" ON "MarketingCampaign"("businessId", "createdAt");

-- CreateIndex: sender cron sweep by status
CREATE INDEX IF NOT EXISTS "MarketingCampaign_status_idx" ON "MarketingCampaign"("status");

-- ----------------------------------------------------------------------------
-- MarketingCampaignBatch (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: MarketingCampaignBatch
-- One Resend batch. status: PENDING | SENDING | SENT | FAILED | CANCELED.
CREATE TABLE IF NOT EXISTS "MarketingCampaignBatch" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    "businessId" TEXT NOT NULL,
    "batchIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "leaseUntil" TIMESTAMP(3),
    "notBefore" TIMESTAMP(3),
    "firstAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,

    "campaignId" TEXT NOT NULL,

    CONSTRAINT "MarketingCampaignBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: batches of a campaign by status
CREATE INDEX IF NOT EXISTS "MarketingCampaignBatch_campaignId_status_idx" ON "MarketingCampaignBatch"("campaignId", "status");

-- CreateIndex: one batch row per (campaign, index)
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingCampaignBatch_campaignId_batchIndex_key" ON "MarketingCampaignBatch"("campaignId", "batchIndex");

-- ----------------------------------------------------------------------------
-- MarketingCampaignRecipient (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: MarketingCampaignRecipient
-- One recipient per campaign. status: PENDING | SENDING | SENT | DELIVERED |
-- BOUNCED | COMPLAINED | FAILED | SKIPPED | CANCELED.
CREATE TABLE IF NOT EXISTS "MarketingCampaignRecipient" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    "businessId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "batchIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resendId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "complainedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),

    "campaignId" TEXT NOT NULL,
    "customerId" TEXT,

    CONSTRAINT "MarketingCampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Resend webhook lookup (event -> recipient)
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingCampaignRecipient_resendId_key" ON "MarketingCampaignRecipient"("resendId");

-- CreateIndex: recipients of a batch
CREATE INDEX IF NOT EXISTS "MarketingCampaignRecipient_campaignId_batchIndex_idx" ON "MarketingCampaignRecipient"("campaignId", "batchIndex");

-- CreateIndex: recipients of a campaign by status
CREATE INDEX IF NOT EXISTS "MarketingCampaignRecipient_campaignId_status_idx" ON "MarketingCampaignRecipient"("campaignId", "status");

-- CreateIndex: SetNull fan-out on customer delete
CREATE INDEX IF NOT EXISTS "MarketingCampaignRecipient_customerId_idx" ON "MarketingCampaignRecipient"("customerId");

-- CreateIndex: one row per (campaign, customer)
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingCampaignRecipient_campaignId_customerId_key" ON "MarketingCampaignRecipient"("campaignId", "customerId");

-- ----------------------------------------------------------------------------
-- Foreign keys
-- ----------------------------------------------------------------------------

-- AddForeignKey: MarketingCampaign -> Business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MarketingCampaign_businessId_fkey'
  ) THEN
    ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: MarketingCampaign -> User (created-by)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MarketingCampaign_createdById_fkey'
  ) THEN
    ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: MarketingCampaignBatch -> MarketingCampaign
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MarketingCampaignBatch_campaignId_fkey'
  ) THEN
    ALTER TABLE "MarketingCampaignBatch" ADD CONSTRAINT "MarketingCampaignBatch_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: MarketingCampaignRecipient -> MarketingCampaign
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MarketingCampaignRecipient_campaignId_fkey'
  ) THEN
    ALTER TABLE "MarketingCampaignRecipient" ADD CONSTRAINT "MarketingCampaignRecipient_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: MarketingCampaignRecipient -> Customer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MarketingCampaignRecipient_customerId_fkey'
  ) THEN
    ALTER TABLE "MarketingCampaignRecipient" ADD CONSTRAINT "MarketingCampaignRecipient_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Backfill
-- ----------------------------------------------------------------------------

-- Customers who opted in before consent evidence existed. The only past writer
-- of acceptsMarketing was the account preferences toggle, so tag them
-- LEGACY_ACCOUNT. marketingConsentAt is deliberately left NULL: we never
-- invent a timestamp for a consent we cannot date.
UPDATE "Customer"
SET "marketingConsentSource" = 'LEGACY_ACCOUNT'
WHERE "acceptsMarketing" = true
  AND "marketingConsentSource" IS NULL;
