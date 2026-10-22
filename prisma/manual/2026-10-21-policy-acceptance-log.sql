-- 2026-10-21-policy-acceptance-log.sql — 2026-10-21
--
-- Additive DDL for the policy acceptance evidence log and the material-update
-- notice send ledger.
--
-- Covers:
--   * PolicyAcceptance — append-only log of policy acceptances, written
--     alongside (never instead of) User.termsAcceptedAt /
--     BusinessMembership.merchantTermsAcceptedAt, which remain the FIRST
--     acceptance. bundle: merchant | platform. method: clickwrap | notice-ack.
--     version: the *_TERMS_VERSION for clickwrap rows, the
--     MaterialPolicyUpdate.id (src/lib/legal/material-updates.ts) for
--     notice-ack rows. userId cascades; businessId (nullable) cascades.
--   * PolicyNotice — one row per material update whose notice email has been
--     sent (idempotency for the platform-hub send). updateId is the PK.
--
-- Hand-apply only. Nothing runs this automatically; there is no migration file
-- backing it. Strictly additive — two CREATE TABLE statements with their
-- indexes and foreign keys; no DROP, no data changes, no backfill. Safe on a
-- live database. The statements below match `prisma migrate diff` output for
-- these models (column types, index names, constraint names, ON DELETE /
-- ON UPDATE). Note the User table is mapped to "user" (lowercase).
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-10-21-policy-acceptance-log.sql
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, and the
-- foreign keys are wrapped in DO blocks that check pg_constraint first, so a
-- second run is a no-op.
--
-- Deploy order is flexible: every code path that writes or reads
-- PolicyAcceptance catches a missing table (Sentry + fail open — signup,
-- claim, onboarding and owner acceptance keep working, the hub falls back to
-- column-only status, admin notices stay hidden). Until this is applied,
-- clickwrap log rows are simply not recorded, so apply it before (or with)
-- the deploy to avoid gaps in the log.

-- ----------------------------------------------------------------------------
-- PolicyAcceptance (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: PolicyAcceptance
CREATE TABLE IF NOT EXISTS "PolicyAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT,
    "bundle" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: "has this person acknowledged version X of bundle Y" lookups
CREATE INDEX IF NOT EXISTS "PolicyAcceptance_userId_bundle_version_idx" ON "PolicyAcceptance"("userId", "bundle", "version");

-- CreateIndex: per-store lookups (platform hub status) + cascade fan-out
CREATE INDEX IF NOT EXISTS "PolicyAcceptance_businessId_idx" ON "PolicyAcceptance"("businessId");

-- ----------------------------------------------------------------------------
-- PolicyNotice (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: PolicyNotice
CREATE TABLE IF NOT EXISTS "PolicyNotice" (
    "updateId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "recipientCount" INTEGER NOT NULL,

    CONSTRAINT "PolicyNotice_pkey" PRIMARY KEY ("updateId")
);

-- ----------------------------------------------------------------------------
-- Foreign keys
-- ----------------------------------------------------------------------------

-- AddForeignKey: PolicyAcceptance -> user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PolicyAcceptance_userId_fkey'
  ) THEN
    ALTER TABLE "PolicyAcceptance" ADD CONSTRAINT "PolicyAcceptance_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: PolicyAcceptance -> Business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PolicyAcceptance_businessId_fkey'
  ) THEN
    ALTER TABLE "PolicyAcceptance" ADD CONSTRAINT "PolicyAcceptance_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
