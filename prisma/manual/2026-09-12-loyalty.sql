-- 2026-09-12-loyalty.sql — 2026-09-12
--
-- Additive DDL for Loyalty Rewards (src/lib/loyalty) — per-business points
-- program with earning and redemption rules.
--
-- Covers:
--   * New table LoyaltyProgram (one row per business; earning rules,
--     redemption settings; flag-gated, off by default)
--   * New table LoyaltyRewardTier (rows per program; fixed redemption tiers
--     like "500 pts -> $5 off"; owner-configured)
--   * New table LoyaltyLedger (append-only points audit trail; every earn/
--     redeem/adjustment writes a row and updates Customer.loyaltyPoints in
--     the same transaction)
--   * Customer.loyaltyPoints (denormalized running balance; always updated
--     via a LoyaltyLedger transaction write), .loyaltyJoinedAt (timestamp of
--     "Join rewards" action on storefront), .birthMonth/.birthDay (PLAINTEXT
--     for cron sweep; no year for privacy)
--   * DiscountCode.source ("manual" = owner-created; "loyalty" = single-use
--     code minted by a rewards redemption)
--
-- UNLIKE 2026-08-25-subscriptions.sql, this file ALTERs two existing tables
-- (Customer, DiscountCode) in addition to creating three new tables. Every
-- ALTER TABLE here adds a nullable-or-defaulted column only — no ALTER
-- COLUMN, no table rewrite, no backfill, no data change to any existing row.
-- Safe to run against a live database.
--
-- Hand-apply only. Nothing runs this automatically; there is no migration
-- file backing it (this repo's Prisma migration baseline is broken — see
-- project memory — so the process is hand-apply / db-push, not
-- `migrate dev`).
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-09-12-loyalty.sql
--
-- Idempotent: every statement is guarded (ADD COLUMN IF NOT EXISTS, CREATE
-- TABLE IF NOT EXISTS, CREATE [UNIQUE] INDEX IF NOT EXISTS, and the foreign
-- keys are wrapped in DO blocks that check pg_constraint first), so a second
-- run is a no-op.
--
-- CHECKLIST: apply this to staging/prod BEFORE deploying the loyalty feature.
-- The earning/redemption routes, cron job, and admin settings page all
-- read/write these columns/tables — on a database missing them, every one of
-- those paths throws against columns Prisma's generated client believes
-- exist. The feature is flag-gated (`loyalty`, default off) so applying this
-- file alone does not turn anything on for existing stores.
--
-- NOTE: "updatedAt" columns have no DEFAULT by design — this matches what
-- `prisma db push` emits for `@updatedAt` fields: the Prisma client sets the
-- value on every create/update, so there is no DB-side default.

-- ----------------------------------------------------------------------------
-- Existing-table columns (Customer, DiscountCode)
-- ----------------------------------------------------------------------------

-- AlterTable: Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "loyaltyPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "loyaltyJoinedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "birthMonth" INTEGER;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "birthDay" INTEGER;

-- CreateIndex: loyalty birthday cron sweep (month/day only, no year)
CREATE INDEX IF NOT EXISTS "Customer_businessId_birthMonth_birthDay_idx" ON "Customer"("businessId", "birthMonth", "birthDay");

-- AlterTable: DiscountCode
ALTER TABLE "DiscountCode" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'manual';

-- ----------------------------------------------------------------------------
-- LoyaltyProgram (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: LoyaltyProgram
-- One row per business, created on first save from /admin/settings/loyalty.
-- Every rule is a toggle + value so turning a rule off keeps the owner's
-- number. Points are snapshotted onto LoyaltyLedger rows at award time —
-- changing a value here never rewrites history.
CREATE TABLE IF NOT EXISTS "LoyaltyProgram" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    "businessId" TEXT NOT NULL,

    "earnOnOrders" BOOLEAN NOT NULL DEFAULT true,
    "pointsPerDollar" INTEGER NOT NULL DEFAULT 1,
    "signupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "signupBonus" INTEGER NOT NULL DEFAULT 0,
    "firstOrderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "firstOrderBonus" INTEGER NOT NULL DEFAULT 0,
    "birthdayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "birthdayBonus" INTEGER NOT NULL DEFAULT 0,
    "socialEnabled" BOOLEAN NOT NULL DEFAULT false,
    "socialFollowBonus" INTEGER NOT NULL DEFAULT 0,

    "rewardCodeExpiryDays" INTEGER NOT NULL DEFAULT 90,

    CONSTRAINT "LoyaltyProgram_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique — one program per business
CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyProgram_businessId_key" ON "LoyaltyProgram"("businessId");

-- ----------------------------------------------------------------------------
-- LoyaltyRewardTier (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: LoyaltyRewardTier
-- A fixed redemption tier ("500 pts -> $5 off"). Rows, not JSON, so a redeem
-- references a stable id and an owner deleting tier #1 between page load and
-- click cannot shift the customer onto a different reward.
CREATE TABLE IF NOT EXISTS "LoyaltyRewardTier" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    "programId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,

    "label" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "minPurchase" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LoyaltyRewardTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: tenant-scoped lookup in redeem + admin list filter
CREATE INDEX IF NOT EXISTS "LoyaltyRewardTier_businessId_active_idx" ON "LoyaltyRewardTier"("businessId", "active");

-- CreateIndex: Cascade fan-out on program delete + tier listing by program
CREATE INDEX IF NOT EXISTS "LoyaltyRewardTier_programId_idx" ON "LoyaltyRewardTier"("programId");

-- ----------------------------------------------------------------------------
-- LoyaltyLedger (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: LoyaltyLedger
-- Append-only points ledger. Customer.loyaltyPoints is the running balance
-- and is written in the same transaction as every row here. sourceKey is the
-- idempotency key — the 15-minute cron, replayed Stripe webhooks, and double
-- clicks all collapse onto @@unique([businessId, sourceKey]).
CREATE TABLE IF NOT EXISTS "LoyaltyLedger" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,

    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,

    "sourceKey" TEXT NOT NULL,

    "orderId" TEXT,
    "discountCodeId" TEXT,
    "actorUserId" TEXT,

    CONSTRAINT "LoyaltyLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique — one ledger row per sourceKey (idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyLedger_businessId_sourceKey_key" ON "LoyaltyLedger"("businessId", "sourceKey");

-- CreateIndex: unique — one ledger row per discount code (one-time redeem)
CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyLedger_discountCodeId_key" ON "LoyaltyLedger"("discountCodeId");

-- CreateIndex: customer account page + balance reads
CREATE INDEX IF NOT EXISTS "LoyaltyLedger_customerId_createdAt_idx" ON "LoyaltyLedger"("customerId", "createdAt");

-- CreateIndex: SetNull fan-out on order delete
CREATE INDEX IF NOT EXISTS "LoyaltyLedger_orderId_idx" ON "LoyaltyLedger"("orderId");

-- ----------------------------------------------------------------------------
-- Foreign keys
-- ----------------------------------------------------------------------------

-- AddForeignKey: LoyaltyProgram -> Business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LoyaltyProgram_businessId_fkey'
  ) THEN
    ALTER TABLE "LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: LoyaltyRewardTier -> LoyaltyProgram
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LoyaltyRewardTier_programId_fkey'
  ) THEN
    ALTER TABLE "LoyaltyRewardTier" ADD CONSTRAINT "LoyaltyRewardTier_programId_fkey"
      FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: LoyaltyLedger -> Business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LoyaltyLedger_businessId_fkey'
  ) THEN
    ALTER TABLE "LoyaltyLedger" ADD CONSTRAINT "LoyaltyLedger_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: LoyaltyLedger -> Customer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LoyaltyLedger_customerId_fkey'
  ) THEN
    ALTER TABLE "LoyaltyLedger" ADD CONSTRAINT "LoyaltyLedger_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: LoyaltyLedger -> Order
-- SetNull: a ledger row (audit trail of a points event) must outlive a
-- deleted/cancelled order; the order id is stored for context but changing
-- it doesn't change the points transaction.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LoyaltyLedger_orderId_fkey'
  ) THEN
    ALTER TABLE "LoyaltyLedger" ADD CONSTRAINT "LoyaltyLedger_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: LoyaltyLedger -> DiscountCode
-- SetNull: a ledger redemption row (audit trail, points already deducted)
-- must survive if the discount code is deleted; the discount code id is
-- stored for context but changing it doesn't change the transaction.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LoyaltyLedger_discountCodeId_fkey'
  ) THEN
    ALTER TABLE "LoyaltyLedger" ADD CONSTRAINT "LoyaltyLedger_discountCodeId_fkey"
      FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
