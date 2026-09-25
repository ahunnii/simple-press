-- 2026-09-24-inventory-items-rentals.sql — 2026-09-24
--
-- Additive DDL for manual inventory items (SKU/category/location/unit cost)
-- and rental check-outs, layered on the existing pool inventory
-- (BaseInventoryUnit / InventoryHistory).
--
-- Covers:
--   * BaseInventoryUnit."itemType" — "stock" (consumable, default — every
--     pre-existing pool) | "rental" (returnable). New "sku" (optional,
--     unique per business — NULLs distinct in Postgres), "category",
--     "storageLocation" and "unitCostCents" (integer cents, nulled for
--     STAFF in the app layer).
--   * InventoryHistory."checkoutId" — SetNull link back to the check-out
--     that produced a checkout/checkin/damage/lost row. Plus two composite
--     indexes ([businessId,createdAt], [baseInventoryUnitId,createdAt]) for
--     the new paginated history views.
--   * InventoryCheckout — one row per rental check-out event (label,
--     optional customer name, encrypted notes, status open|closed,
--     checkedOutAt, optional dueBackOn/closedAt, optional createdBy).
--   * InventoryCheckoutLine — one row per item on a check-out
--     (itemId SetNull + itemName snapshot, qtyOut/qtyReturned/qtyDamaged/
--     qtyLost). Outstanding quantity is computed in the app, never stored.
--
-- Hand-apply only. Nothing runs this automatically; there is no migration
-- file backing it. Strictly additive — new columns on BaseInventoryUnit and
-- InventoryHistory (both nullable/defaulted), two new tables, their indexes
-- and foreign keys. No DROP, no data rewrite, no ALTER to any existing
-- column's type or nullability. Safe to run against a live database.
--
-- IMPORTANT — run with PLAIN psql, never -1/--single-transaction:
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-09-24-inventory-items-rentals.sql
--
-- The two new InventoryHistory composite indexes at the bottom of this file
-- use CREATE INDEX CONCURRENTLY, because InventoryHistory takes live writes
-- from the Stripe webhook and order paths; CONCURRENTLY cannot run inside a
-- transaction, so it must never be wrapped in BEGIN/COMMIT or in `psql -1`.
-- Everything else in this file is a normal guarded statement and is safe
-- inside psql's own per-statement autocommit.
--
-- Apply this file BEFORE `pnpm db:push`, so `db push` sees no diff once the
-- schema ships (a push run after ALTER/CREATE guarded with IF NOT EXISTS is
-- a no-op against a database that already has these objects).
--
-- Idempotent: every statement is guarded with CREATE TABLE/INDEX IF NOT
-- EXISTS or ADD COLUMN IF NOT EXISTS, and the foreign keys are wrapped in DO
-- blocks that check pg_constraint first, so a second run is a no-op.
--
-- CHECKLIST: apply this to staging/prod BEFORE deploying the inventory
-- items/rentals feature. The base-inventory-unit and inventory-checkout
-- routers read/write these columns and tables — on a database missing them,
-- every one of those paths throws against columns/tables Prisma's generated
-- client believes exist.
--
-- NOTE: InventoryCheckout."notes" is `/// @encrypted` (prisma-field-encryption,
-- same convention as Invoice.notes) and can never appear in a `where`.
-- "updatedAt" columns on the two new tables have no DEFAULT by design — this
-- matches what `prisma db push` emits for `@updatedAt` fields: the Prisma
-- client sets the value on every create/update, so there is no DB-side
-- default. InventoryCheckoutLine has no separate "createdAt"-only variant —
-- both new tables carry updatedAt because, unlike InvoicePayment/InvoiceEvent,
-- check-out lines are mutated in place on check-in.

-- ----------------------------------------------------------------------------
-- BaseInventoryUnit: item type, SKU, category, location, unit cost
-- ----------------------------------------------------------------------------

ALTER TABLE "BaseInventoryUnit" ADD COLUMN IF NOT EXISTS "itemType" TEXT NOT NULL DEFAULT 'stock';
ALTER TABLE "BaseInventoryUnit" ADD COLUMN IF NOT EXISTS "sku" TEXT;
ALTER TABLE "BaseInventoryUnit" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "BaseInventoryUnit" ADD COLUMN IF NOT EXISTS "storageLocation" TEXT;
ALTER TABLE "BaseInventoryUnit" ADD COLUMN IF NOT EXISTS "unitCostCents" INTEGER;

-- CreateIndex: per-business SKU uniqueness (NULLs distinct — many SKU-less
-- items are fine; case-insensitive matching is enforced in the app).
CREATE UNIQUE INDEX IF NOT EXISTS "BaseInventoryUnit_businessId_sku_key" ON "BaseInventoryUnit"("businessId", "sku");

-- ----------------------------------------------------------------------------
-- InventoryHistory: link to the check-out that produced the row
-- ----------------------------------------------------------------------------

ALTER TABLE "InventoryHistory" ADD COLUMN IF NOT EXISTS "checkoutId" TEXT;

-- CreateIndex: SetNull fan-out / check-out detail history
CREATE INDEX IF NOT EXISTS "InventoryHistory_checkoutId_idx" ON "InventoryHistory"("checkoutId");

-- ----------------------------------------------------------------------------
-- InventoryCheckout (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: InventoryCheckout
-- One row per rental check-out event (label/customer/notes + status).
CREATE TABLE IF NOT EXISTS "InventoryCheckout" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    "businessId" TEXT NOT NULL,

    "label" TEXT NOT NULL,
    "customerName" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "checkedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueBackOn" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    "createdById" TEXT,

    CONSTRAINT "InventoryCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: checkouts list — status filter + due-date sort
CREATE INDEX IF NOT EXISTS "InventoryCheckout_businessId_status_dueBackOn_idx" ON "InventoryCheckout"("businessId", "status", "dueBackOn");

-- CreateIndex: checkouts list — default sort
CREATE INDEX IF NOT EXISTS "InventoryCheckout_businessId_checkedOutAt_idx" ON "InventoryCheckout"("businessId", "checkedOutAt");

-- ----------------------------------------------------------------------------
-- InventoryCheckoutLine (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: InventoryCheckoutLine
-- One row per item on a check-out. Outstanding qty is computed in the app
-- (qtyOut - qtyReturned - qtyDamaged - qtyLost), never stored.
CREATE TABLE IF NOT EXISTS "InventoryCheckoutLine" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    "checkoutId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,

    "itemId" TEXT,
    "itemName" TEXT NOT NULL,

    "qtyOut" INTEGER NOT NULL,
    "qtyReturned" INTEGER NOT NULL DEFAULT 0,
    "qtyDamaged" INTEGER NOT NULL DEFAULT 0,
    "qtyLost" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InventoryCheckoutLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: at most one line per item per check-out
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryCheckoutLine_checkoutId_itemId_key" ON "InventoryCheckoutLine"("checkoutId", "itemId");

-- CreateIndex: SetNull fan-out / item detail "currently out" lookups
CREATE INDEX IF NOT EXISTS "InventoryCheckoutLine_itemId_idx" ON "InventoryCheckoutLine"("itemId");

-- CreateIndex: tenant scoping
CREATE INDEX IF NOT EXISTS "InventoryCheckoutLine_businessId_idx" ON "InventoryCheckoutLine"("businessId");

-- ----------------------------------------------------------------------------
-- Foreign keys
-- ----------------------------------------------------------------------------

-- AddForeignKey: InventoryHistory -> InventoryCheckout (SetNull: history rows
-- outlive the check-out row they were generated from)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InventoryHistory_checkoutId_fkey'
  ) THEN
    ALTER TABLE "InventoryHistory" ADD CONSTRAINT "InventoryHistory_checkoutId_fkey"
      FOREIGN KEY ("checkoutId") REFERENCES "InventoryCheckout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: InventoryCheckout -> Business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InventoryCheckout_businessId_fkey'
  ) THEN
    ALTER TABLE "InventoryCheckout" ADD CONSTRAINT "InventoryCheckout_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: InventoryCheckout -> User (SetNull: check-out records
-- outlive the user who created them)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InventoryCheckout_createdById_fkey'
  ) THEN
    ALTER TABLE "InventoryCheckout" ADD CONSTRAINT "InventoryCheckout_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: InventoryCheckoutLine -> InventoryCheckout
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InventoryCheckoutLine_checkoutId_fkey'
  ) THEN
    ALTER TABLE "InventoryCheckoutLine" ADD CONSTRAINT "InventoryCheckoutLine_checkoutId_fkey"
      FOREIGN KEY ("checkoutId") REFERENCES "InventoryCheckout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: InventoryCheckoutLine -> Business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InventoryCheckoutLine_businessId_fkey'
  ) THEN
    ALTER TABLE "InventoryCheckoutLine" ADD CONSTRAINT "InventoryCheckoutLine_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: InventoryCheckoutLine -> BaseInventoryUnit (SetNull: a
-- deleted item leaves the line as a historical snapshot via itemName)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InventoryCheckoutLine_itemId_fkey'
  ) THEN
    ALTER TABLE "InventoryCheckoutLine" ADD CONSTRAINT "InventoryCheckoutLine_itemId_fkey"
      FOREIGN KEY ("itemId") REFERENCES "BaseInventoryUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- InventoryHistory: new composite indexes (CONCURRENTLY)
-- ----------------------------------------------------------------------------
--
-- InventoryHistory takes live writes from the Stripe webhook and order
-- paths, so these two indexes are built CONCURRENTLY to avoid locking out
-- writers. Each is its own top-level statement — CREATE INDEX CONCURRENTLY
-- cannot run inside a transaction (including inside a DO block), which is
-- exactly why this whole file must be run with plain `psql -f`, never
-- `-1`/`--single-transaction`.

-- CreateIndex CONCURRENTLY: item detail / activity log, business-scoped, newest first
CREATE INDEX CONCURRENTLY IF NOT EXISTS "InventoryHistory_businessId_createdAt_idx" ON "InventoryHistory"("businessId", "createdAt");

-- CreateIndex CONCURRENTLY: item detail movement history, paginated
CREATE INDEX CONCURRENTLY IF NOT EXISTS "InventoryHistory_baseInventoryUnitId_createdAt_idx" ON "InventoryHistory"("baseInventoryUnitId", "createdAt");
