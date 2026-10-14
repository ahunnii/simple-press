-- 2026-10-12-invoice-event-business-index.sql — 2026-10-12
--
-- Adds a (businessId, createdAt) index on "InvoiceEvent" for the store-wide
-- Invoices → Activity log (newest-first feed + date-range filter across every
-- invoice in a business). The table only had ("invoiceId", "createdAt"), which
-- serves the per-invoice timeline but would scan for a business-wide feed.
--
-- Covers:
--   * "InvoiceEvent_businessId_createdAt_idx" — matches the Prisma
--     `@@index([businessId, createdAt])` on model InvoiceEvent, so
--     `pnpm db:push` is a no-op against a DB that already ran this.
--
-- Idempotent: safe to re-run.

CREATE INDEX IF NOT EXISTS "InvoiceEvent_businessId_createdAt_idx"
  ON "InvoiceEvent" ("businessId", "createdAt");
