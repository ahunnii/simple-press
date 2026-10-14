-- 2026-10-12-product-customizer.sql — 2026-10-12
--
-- Additive DDL for the product customizer (option groups beside variants).
--
-- Covers:
--   * ProductOptionGroup — per-business shared group of choices or a free-text
--     input (name, required, min/max picks, "first N included", display,
--     text max length / placeholder / price).
--   * ProductOptionGroupOnProduct — join table attaching groups to products
--     (composite primary key, sortOrder).
--   * ProductOptionValue — a selectable value in a group (label, image/swatch,
--     add-on price in cents, optional link to a Product / ProductVariant whose
--     price + stock it uses, optional priceOverride in cents).
--   * OrderItem."customization" — jsonb snapshot of what the customer chose
--     (versioned; see src/lib/customizer/types.ts).
--   * InventoryReservation."lineConfigs" — jsonb of customizer selections keyed
--     by checkout lineKey; read by the Stripe webhook.
--
-- Hand-apply only. Nothing runs this automatically; there is no migration
-- file backing it. Strictly additive — three new tables, two nullable jsonb
-- columns, their indexes and foreign keys. No DROP, no data rewrite, no ALTER
-- to any existing column's type or nullability. Safe to run against a live
-- database.
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-10-12-product-customizer.sql
--
-- Apply this file BEFORE `pnpm db:push`, so `db push` sees no diff once the
-- schema ships (a push run after CREATE/ALTER guarded with IF NOT EXISTS is a
-- no-op against a database that already has these objects).
--
-- Idempotent: every statement is guarded with CREATE TABLE/INDEX IF NOT
-- EXISTS or ADD COLUMN IF NOT EXISTS, and the foreign keys are wrapped in DO
-- blocks that check pg_constraint first, so a second run is a no-op.
--
-- CHECKLIST: apply this to staging/prod BEFORE deploying the product
-- customizer. Checkout, the Stripe webhook and order reads touch
-- "OrderItem"."customization" and "InventoryReservation"."lineConfigs" — on a
-- database missing them, Prisma's generated client throws on every order write.
--
-- NOTE: "updatedAt" columns have no DEFAULT by design — this matches what
-- `prisma db push` emits for `@updatedAt` fields: the Prisma client sets the
-- value on every create/update, so there is no DB-side default.
-- ProductOptionGroupOnProduct has no "updatedAt" (rows are only created and
-- deleted; reorders update "sortOrder").
-- ProductOptionValue."linkedProductId" is ON DELETE CASCADE: deleting a linked
-- product removes the values that pointed at it (the admin delete dialog
-- warns). "linkedVariantId" is ON DELETE SET NULL.

-- ----------------------------------------------------------------------------
-- ProductOptionGroup
-- ----------------------------------------------------------------------------

-- CreateTable: ProductOptionGroup
CREATE TABLE IF NOT EXISTS "ProductOptionGroup" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    "businessId" TEXT NOT NULL,

    "name" TEXT NOT NULL,
    "adminLabel" TEXT,
    "helpText" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'choice',
    "required" BOOLEAN NOT NULL DEFAULT false,

    "minSelections" INTEGER NOT NULL DEFAULT 0,
    "maxSelections" INTEGER NOT NULL DEFAULT 1,
    "includedCount" INTEGER NOT NULL DEFAULT 0,
    "display" TEXT NOT NULL DEFAULT 'tiles',

    "maxLength" INTEGER,
    "placeholder" TEXT,
    "textPriceCents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductOptionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: tenant scoping
CREATE INDEX IF NOT EXISTS "ProductOptionGroup_businessId_idx" ON "ProductOptionGroup"("businessId");

-- ----------------------------------------------------------------------------
-- ProductOptionGroupOnProduct
-- ----------------------------------------------------------------------------

-- CreateTable: ProductOptionGroupOnProduct
CREATE TABLE IF NOT EXISTS "ProductOptionGroupOnProduct" (
    "productId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductOptionGroupOnProduct_pkey" PRIMARY KEY ("productId", "groupId")
);

-- CreateIndex: group -> products lookups / cascade fan-out
CREATE INDEX IF NOT EXISTS "ProductOptionGroupOnProduct_groupId_idx" ON "ProductOptionGroupOnProduct"("groupId");

-- ----------------------------------------------------------------------------
-- ProductOptionValue
-- ----------------------------------------------------------------------------

-- CreateTable: ProductOptionValue
CREATE TABLE IF NOT EXISTS "ProductOptionValue" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    "groupId" TEXT NOT NULL,

    "label" TEXT NOT NULL,
    "imageUrl" TEXT,
    "swatchColor" TEXT,

    "priceDelta" INTEGER NOT NULL DEFAULT 0,
    "priceOverride" INTEGER,

    "linkedProductId" TEXT,
    "linkedVariantId" TEXT,

    "available" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductOptionValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: values of a group
CREATE INDEX IF NOT EXISTS "ProductOptionValue_groupId_idx" ON "ProductOptionValue"("groupId");

-- CreateIndex: cascade fan-out / "is this product used as an option" lookups
CREATE INDEX IF NOT EXISTS "ProductOptionValue_linkedProductId_idx" ON "ProductOptionValue"("linkedProductId");

-- CreateIndex: SetNull fan-out / variant usage lookups
CREATE INDEX IF NOT EXISTS "ProductOptionValue_linkedVariantId_idx" ON "ProductOptionValue"("linkedVariantId");

-- ----------------------------------------------------------------------------
-- OrderItem / InventoryReservation: customizer JSON columns
-- ----------------------------------------------------------------------------

-- Versioned snapshot of the customer's configuration (null for plain lines).
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "customization" JSONB;

-- Customizer selections keyed by checkout lineKey (null when no configured lines).
ALTER TABLE "InventoryReservation" ADD COLUMN IF NOT EXISTS "lineConfigs" JSONB;

-- ----------------------------------------------------------------------------
-- Foreign keys
-- ----------------------------------------------------------------------------

-- AddForeignKey: ProductOptionGroup -> Business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductOptionGroup_businessId_fkey'
  ) THEN
    ALTER TABLE "ProductOptionGroup" ADD CONSTRAINT "ProductOptionGroup_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: ProductOptionGroupOnProduct -> Product
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductOptionGroupOnProduct_productId_fkey'
  ) THEN
    ALTER TABLE "ProductOptionGroupOnProduct" ADD CONSTRAINT "ProductOptionGroupOnProduct_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: ProductOptionGroupOnProduct -> ProductOptionGroup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductOptionGroupOnProduct_groupId_fkey'
  ) THEN
    ALTER TABLE "ProductOptionGroupOnProduct" ADD CONSTRAINT "ProductOptionGroupOnProduct_groupId_fkey"
      FOREIGN KEY ("groupId") REFERENCES "ProductOptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: ProductOptionValue -> ProductOptionGroup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductOptionValue_groupId_fkey'
  ) THEN
    ALTER TABLE "ProductOptionValue" ADD CONSTRAINT "ProductOptionValue_groupId_fkey"
      FOREIGN KEY ("groupId") REFERENCES "ProductOptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: ProductOptionValue -> Product (Cascade: a value linked to a
-- deleted product has nothing left to sell)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductOptionValue_linkedProductId_fkey'
  ) THEN
    ALTER TABLE "ProductOptionValue" ADD CONSTRAINT "ProductOptionValue_linkedProductId_fkey"
      FOREIGN KEY ("linkedProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: ProductOptionValue -> ProductVariant (SetNull)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductOptionValue_linkedVariantId_fkey'
  ) THEN
    ALTER TABLE "ProductOptionValue" ADD CONSTRAINT "ProductOptionValue_linkedVariantId_fkey"
      FOREIGN KEY ("linkedVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
