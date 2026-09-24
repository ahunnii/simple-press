-- 2026-09-23-invoices.sql — 2026-09-23
--
-- Additive DDL for native SimplePress invoices (parallel to the QuickBooks
-- lane in QuickBooksInvoice): per-business invoice settings, the invoices
-- themselves, manually recorded payments, and an append-only activity log.
--
-- Covers:
--   * InvoiceSettings — 1:1 per business, upserted on the first invoice.create.
--     Numbering (prefix/padding/starting number), default due terms/tax/notes/
--     terms, encrypted payment-method JSON, overdue-alert + weekly-digest
--     toggles and digest bookkeeping.
--   * Invoice — one row per native invoice, numbered per business
--     (unique businessId + invoiceNumber). Money is integer cents. Customer
--     name/email are plaintext (matches Customer/Order); phone, billing
--     address, line items, notes, terms, payment instructions and cancel
--     reason are encrypted TEXT.
--   * InvoicePayment — one row per manually recorded payment against an
--     invoice (encrypted reference/note).
--   * InvoiceEvent — append-only activity log per invoice. "businessId" is
--     denormalized and deliberately has NO foreign key.
--
-- Hand-apply only. Nothing runs this automatically; there is no migration file
-- backing it. Strictly additive — four CREATE TABLE statements, their indexes
-- and foreign keys, no DROP, no data rewrite, no ALTER to existing tables.
-- Safe to run against a live database.
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-09-23-invoices.sql
--
-- Idempotent: the statements are guarded with CREATE TABLE IF NOT EXISTS and
-- CREATE [UNIQUE] INDEX IF NOT EXISTS, and the foreign keys are wrapped in DO
-- blocks that check pg_constraint first, so a second run is a no-op.
--
-- CHECKLIST: apply this to staging/prod BEFORE deploying the invoices feature.
-- The invoice router, public invoice view, and the overdue-alert / weekly-digest
-- crons all read/write these tables — on a database missing them, every one of
-- those paths throws against tables Prisma's generated client believes exist.
--
-- NOTE: every `/// @encrypted` column is TEXT (prisma-field-encryption handles
-- encryption/decryption) and can never appear in a `where`. Invoice.lineItems
-- and InvoiceSettings.paymentMethods are encrypted JSON strings, validated with
-- zod on read in src/lib/invoices/. Invoice.issuerSnapshot and
-- InvoiceEvent.metadata are plaintext JSONB — non-sensitive data only.
-- "updatedAt" columns have no DEFAULT by design — this matches what
-- `prisma db push` emits for `@updatedAt` fields: the Prisma client sets the
-- value on every create/update, so there is no DB-side default.
-- InvoicePayment and InvoiceEvent have no "updatedAt" (append-only rows).

-- ----------------------------------------------------------------------------
-- InvoiceSettings (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: InvoiceSettings
-- Per-business invoice defaults (1:1). Upserted on first invoice.create.
CREATE TABLE IF NOT EXISTS "InvoiceSettings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    "businessId" TEXT NOT NULL,

    "numberPrefix" TEXT NOT NULL DEFAULT 'INV-',
    "numberPadding" INTEGER NOT NULL DEFAULT 4,
    "startingNumber" INTEGER NOT NULL DEFAULT 1,

    "defaultDueTerms" TEXT NOT NULL DEFAULT 'net_30',
    "defaultTaxRateBps" INTEGER NOT NULL DEFAULT 0,

    "defaultNotes" TEXT,
    "defaultTerms" TEXT,
    "paymentMethods" TEXT,

    "overdueAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weeklyDigestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastDigestWeekKey" TEXT,
    "lastDigestSentAt" TIMESTAMP(3),

    CONSTRAINT "InvoiceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: 1:1 with Business (settings lookup/upsert by businessId)
CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceSettings_businessId_key" ON "InvoiceSettings"("businessId");

-- ----------------------------------------------------------------------------
-- Invoice (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: Invoice
-- One row per native invoice. Status is derived from payments
-- (DRAFT | SENT | PARTIALLY_PAID | PAID | CANCELLED).
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    "businessId" TEXT NOT NULL,

    "invoiceNumber" INTEGER NOT NULL,
    "numberPrefix" TEXT NOT NULL DEFAULT 'INV-',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',

    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "billingAddress" TEXT,

    "currency" TEXT NOT NULL DEFAULT 'usd',
    "lineItems" TEXT NOT NULL,

    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "discountType" TEXT,
    "discountValue" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "taxRateBps" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "amountPaidCents" INTEGER NOT NULL DEFAULT 0,

    "dueTerms" TEXT NOT NULL DEFAULT 'net_30',
    "issueDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),

    "notes" TEXT,
    "terms" TEXT,
    "paymentMethodIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "paymentInstructions" TEXT,
    "issuerSnapshot" JSONB,

    "sentAt" TIMESTAMP(3),
    "sentVia" TEXT,
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,

    "lastReminderSentAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "overdueNotifiedAt" TIMESTAMP(3),
    "firstViewedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: per-business numbering + number lookup
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_businessId_invoiceNumber_key" ON "Invoice"("businessId", "invoiceNumber");

-- CreateIndex: /admin/invoices list + status filter
CREATE INDEX IF NOT EXISTS "Invoice_businessId_status_createdAt_idx" ON "Invoice"("businessId", "status", "createdAt");

-- CreateIndex: due-date sort / upcoming-due views
CREATE INDEX IF NOT EXISTS "Invoice_businessId_dueDate_idx" ON "Invoice"("businessId", "dueDate");

-- CreateIndex: customer detail + SetNull fan-out
CREATE INDEX IF NOT EXISTS "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex: cron overdue sweep
CREATE INDEX IF NOT EXISTS "Invoice_status_overdueNotifiedAt_dueDate_idx" ON "Invoice"("status", "overdueNotifiedAt", "dueDate");

-- ----------------------------------------------------------------------------
-- InvoicePayment (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: InvoicePayment
-- One row per manually recorded payment. Append-only (no updatedAt).
CREATE TABLE IF NOT EXISTS "InvoicePayment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "invoiceId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,

    "amountCents" INTEGER NOT NULL,
    "paidOn" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,

    "reference" TEXT,
    "note" TEXT,

    "recordedByUserId" TEXT,
    "receiptSentAt" TIMESTAMP(3),

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: invoice detail payment history
CREATE INDEX IF NOT EXISTS "InvoicePayment_invoiceId_paidOn_idx" ON "InvoicePayment"("invoiceId", "paidOn");

-- CreateIndex: weekly digest / collected-in-period totals
CREATE INDEX IF NOT EXISTS "InvoicePayment_businessId_paidOn_idx" ON "InvoicePayment"("businessId", "paidOn");

-- ----------------------------------------------------------------------------
-- InvoiceEvent (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: InvoiceEvent
-- Append-only activity log per invoice. "businessId" has no foreign key.
CREATE TABLE IF NOT EXISTS "InvoiceEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "invoiceId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,

    "type" TEXT NOT NULL,
    "actorUserId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "InvoiceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: invoice detail activity timeline
CREATE INDEX IF NOT EXISTS "InvoiceEvent_invoiceId_createdAt_idx" ON "InvoiceEvent"("invoiceId", "createdAt");

-- ----------------------------------------------------------------------------
-- Foreign keys
-- ----------------------------------------------------------------------------

-- AddForeignKey: InvoiceSettings -> Business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceSettings_businessId_fkey'
  ) THEN
    ALTER TABLE "InvoiceSettings" ADD CONSTRAINT "InvoiceSettings_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: Invoice -> Business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_businessId_fkey'
  ) THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: Invoice -> Customer (SetNull: invoices outlive the customer row)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_customerId_fkey'
  ) THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: InvoicePayment -> Invoice
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InvoicePayment_invoiceId_fkey'
  ) THEN
    ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey"
      FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: InvoicePayment -> Business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InvoicePayment_businessId_fkey'
  ) THEN
    ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: InvoiceEvent -> Invoice
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceEvent_invoiceId_fkey'
  ) THEN
    ALTER TABLE "InvoiceEvent" ADD CONSTRAINT "InvoiceEvent_invoiceId_fkey"
      FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
