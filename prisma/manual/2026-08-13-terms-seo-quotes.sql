-- 2026-08-13-terms-seo-quotes.sql — 2026-08-13
--
-- Additive DDL for schema changes that shipped in schema.prisma across commits
-- aba1c3d ("settings updates"), 8f2146c ("terms and policy widening to better
-- match more situations"), and a3176b7 ("init new feature - a quote
-- calculator") but never got a matching entry under prisma/migrations/ —
-- the baseline there is broken (see project memory: "all migrations report
-- unapplied") so this repo's process is hand-apply / db-push, not
-- `migrate dev`. This file is the hand-apply record for those three commits.
--
-- Covers:
--   * User.termsAcceptedAt / User.termsVersion (platform ToS acceptance)
--   * BusinessMembership.merchantTermsAcceptedAt / .merchantTermsVersion
--     (Seller & Merchant Agreement acceptance, per membership)
--   * Order.termsAcceptedAt / .termsVersion / .merchantTermsUpdatedAt
--     (terms snapshot captured at checkout)
--   * SiteContent.pageMeta (per-route SEO overrides) / .siteVerification
--     (search-engine ownership tokens)
--   * New tables QuoteCalculator + QuoteSubmission (quote calculator feature)
--
-- Hand-apply only. Nothing runs this automatically; there is no migration
-- file backing it (see above). Strictly additive — every ALTER TABLE adds a
-- nullable column with no default and no backfill, every CREATE TABLE/INDEX
-- is new, and there is not a single DROP, ALTER COLUMN, or data rewrite in
-- this file. Safe to run against a live database.
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-08-13-terms-seo-quotes.sql
--
-- Idempotent: every statement is guarded (ADD COLUMN IF NOT EXISTS, CREATE
-- TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, and the foreign keys are
-- wrapped in DO blocks that check pg_constraint first), so a second run is a
-- no-op.
--
-- CHECKLIST: apply this to staging/prod BEFORE deploying the commits above.
-- The storefront root layout reads SiteContent.pageMeta/siteVerification on
-- every public page render, and the Stripe webhook writes Order.termsAcceptedAt
-- / .termsVersion / .merchantTermsUpdatedAt on every order it creates — on a
-- database missing these columns, both paths throw against a live column that
-- Prisma's generated client believes exists.

-- ----------------------------------------------------------------------------
-- Terms-of-service acceptance (aba1c3d / 8f2146c)
-- ----------------------------------------------------------------------------

-- AlterTable: User (mapped to table "user" — @@map("user") in schema.prisma)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "termsVersion" TEXT;

-- AlterTable: BusinessMembership
ALTER TABLE "BusinessMembership" ADD COLUMN IF NOT EXISTS "merchantTermsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "BusinessMembership" ADD COLUMN IF NOT EXISTS "merchantTermsVersion" TEXT;

-- AlterTable: Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "termsVersion" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "merchantTermsUpdatedAt" TIMESTAMP(3);

-- ----------------------------------------------------------------------------
-- SEO widening (aba1c3d)
-- ----------------------------------------------------------------------------

-- AlterTable: SiteContent
ALTER TABLE "SiteContent" ADD COLUMN IF NOT EXISTS "pageMeta" JSONB;
ALTER TABLE "SiteContent" ADD COLUMN IF NOT EXISTS "siteVerification" JSONB;

-- ----------------------------------------------------------------------------
-- Quote calculator feature (a3176b7)
-- ----------------------------------------------------------------------------

-- CreateTable: QuoteCalculator (parent — must exist before QuoteSubmission's FK)
CREATE TABLE IF NOT EXISTS "QuoteCalculator" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "QuoteCalculator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QuoteCalculator_businessId_idx" ON "QuoteCalculator"("businessId");

-- CreateTable: QuoteSubmission
CREATE TABLE IF NOT EXISTS "QuoteSubmission" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "answers" JSONB NOT NULL,
    "estimateCents" INTEGER,
    "formulaSnapshot" JSONB NOT NULL,
    "finalQuoteCents" INTEGER,
    "quoteSentAt" TIMESTAMP(3),
    "sentQuoteCents" INTEGER,
    "sentMessage" TEXT,
    "calculatorName" TEXT NOT NULL,
    "showEstimateToCustomer" BOOLEAN NOT NULL DEFAULT false,
    "calculatorId" TEXT,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "QuoteSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QuoteSubmission_businessId_status_createdAt_idx" ON "QuoteSubmission"("businessId", "status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QuoteSubmission_businessId_createdAt_idx" ON "QuoteSubmission"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QuoteSubmission_calculatorId_idx" ON "QuoteSubmission"("calculatorId");

-- AddForeignKey — wrapped in DO blocks: Postgres has no
-- "ADD CONSTRAINT IF NOT EXISTS", so idempotency is done by checking
-- pg_constraint before adding each one (same effect, only way to express it).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuoteCalculator_businessId_fkey'
  ) THEN
    ALTER TABLE "QuoteCalculator" ADD CONSTRAINT "QuoteCalculator_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuoteSubmission_calculatorId_fkey'
  ) THEN
    -- SetNull, not Cascade: submissions are a business's lead pipeline and
    -- must outlive the calculator that produced them (everything the inbox
    -- renders is snapshotted onto the QuoteSubmission row already).
    ALTER TABLE "QuoteSubmission" ADD CONSTRAINT "QuoteSubmission_calculatorId_fkey"
      FOREIGN KEY ("calculatorId") REFERENCES "QuoteCalculator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuoteSubmission_businessId_fkey'
  ) THEN
    ALTER TABLE "QuoteSubmission" ADD CONSTRAINT "QuoteSubmission_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
