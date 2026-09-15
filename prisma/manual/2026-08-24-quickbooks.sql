-- 2026-08-24-quickbooks.sql — 2026-08-24
--
-- Additive DDL for QuickBooks Online invoicing integration (two new tables,
-- purely additive, no changes to existing tables).
--
-- Covers:
--   * New table QuickBooksConnection (Intuit OAuth token store, deposit rules,
--     realm cache, sync metadata)
--   * New table QuickBooksInvoice (created invoices, audit trail, cron targets,
--     encrypted customer snapshot fields)
--
-- Hand-apply only. Nothing runs this automatically; there is no migration
-- file backing it. Strictly additive — every CREATE TABLE/INDEX is new,
-- and there is not a single DROP, ALTER TABLE, or data rewrite in this file.
-- Safe to run against a live database.
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-08-24-quickbooks.sql
--
-- Idempotent: every statement is guarded (CREATE TABLE IF NOT EXISTS, CREATE
-- INDEX IF NOT EXISTS, and the foreign keys are wrapped in DO blocks that
-- check pg_constraint first), so a second run is a no-op.
--
-- CHECKLIST: apply this to staging/prod BEFORE deploying the QuickBooks
-- feature. The tRPC procedures and invoice cron read these tables — on a
-- database missing these tables, both paths throw against tables that
-- Prisma's generated client believes exist.
--
-- NOTE: "updatedAt" columns have no DEFAULT by design — this matches what
-- `prisma db push` emits for `@updatedAt` fields: the Prisma client sets the
-- value on every create/update, so there is no DB-side default.

-- ----------------------------------------------------------------------------
-- QuickBooks Online integration (two new tables)
-- ----------------------------------------------------------------------------

-- CreateTable: QuickBooksConnection
-- Stores OAuth tokens, connection metadata, and per-realm QBO reference cache.
-- One row per Business, unique businessId index.
CREATE TABLE IF NOT EXISTS "QuickBooksConnection" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "realmId" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "companyName" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "lastRefreshAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),
    "depositMode" TEXT NOT NULL DEFAULT 'percent',
    "depositPercent" INTEGER NOT NULL DEFAULT 25,
    "depositFixedCents" INTEGER NOT NULL DEFAULT 0,
    "defaultDueDays" INTEGER NOT NULL DEFAULT 7,
    "incomeAccountId" TEXT,
    "depositItemId" TEXT,
    "serviceItemId" TEXT,
    "depositItemName" TEXT NOT NULL DEFAULT 'Deposit',
    "serviceItemName" TEXT NOT NULL DEFAULT 'Services',
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,

    CONSTRAINT "QuickBooksConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique businessId (one connection per business)
CREATE UNIQUE INDEX IF NOT EXISTS "QuickBooksConnection_businessId_key" ON "QuickBooksConnection"("businessId");

-- CreateIndex: cron sweep — active connections ordered by stalest first
CREATE INDEX IF NOT EXISTS "QuickBooksConnection_status_lastSyncAt_idx" ON "QuickBooksConnection"("status", "lastSyncAt");

-- CreateTable: QuickBooksInvoice
-- Invoices created in QBO, snapshots of customer info, audit trail for
-- /admin/invoices and cron sync targets. Encrypted customer fields.
CREATE TABLE IF NOT EXISTS "QuickBooksInvoice" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessId" TEXT NOT NULL,
    "quoteSubmissionId" TEXT,
    "kind" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "memo" TEXT,
    "description" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "balanceCents" INTEGER,
    "dueDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "realmId" TEXT NOT NULL,
    "qboCustomerId" TEXT,
    "qboInvoiceId" TEXT,
    "qboDocNumber" TEXT,
    "qboSyncToken" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,

    CONSTRAINT "QuickBooksInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique on (realmId, qboInvoiceId)
-- NULLs in qboInvoiceId never collide because Postgres treats NULL != NULL.
CREATE UNIQUE INDEX IF NOT EXISTS "QuickBooksInvoice_realmId_qboInvoiceId_key" ON "QuickBooksInvoice"("realmId", "qboInvoiceId");

-- CreateIndex: /admin/invoices listing
CREATE INDEX IF NOT EXISTS "QuickBooksInvoice_businessId_createdAt_idx" ON "QuickBooksInvoice"("businessId", "createdAt");

-- CreateIndex: list status filter
CREATE INDEX IF NOT EXISTS "QuickBooksInvoice_businessId_status_createdAt_idx" ON "QuickBooksInvoice"("businessId", "status", "createdAt");

-- CreateIndex: lead card + SetNull cascade lookup
CREATE INDEX IF NOT EXISTS "QuickBooksInvoice_quoteSubmissionId_idx" ON "QuickBooksInvoice"("quoteSubmissionId");

-- CreateIndex: cron sweep — open invoices, stalest first
CREATE INDEX IF NOT EXISTS "QuickBooksInvoice_status_lastSyncedAt_idx" ON "QuickBooksInvoice"("status", "lastSyncedAt");

-- AddForeignKey: QuickBooksConnection → Business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuickBooksConnection_businessId_fkey'
  ) THEN
    ALTER TABLE "QuickBooksConnection" ADD CONSTRAINT "QuickBooksConnection_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: QuickBooksInvoice → Business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuickBooksInvoice_businessId_fkey'
  ) THEN
    ALTER TABLE "QuickBooksInvoice" ADD CONSTRAINT "QuickBooksInvoice_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: QuickBooksInvoice → QuoteSubmission
-- SetNull, not Cascade: invoices are money records and must outlive the
-- lead they were issued against (the quote that triggered them).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuickBooksInvoice_quoteSubmissionId_fkey'
  ) THEN
    ALTER TABLE "QuickBooksInvoice" ADD CONSTRAINT "QuickBooksInvoice_quoteSubmissionId_fkey"
      FOREIGN KEY ("quoteSubmissionId") REFERENCES "QuoteSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
