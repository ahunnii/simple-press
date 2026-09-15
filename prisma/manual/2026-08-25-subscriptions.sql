-- 2026-08-25-subscriptions.sql — 2026-08-25
--
-- Additive DDL for Product Subscriptions (Stripe Billing on the store's
-- connected account) — Phase 1a of the subscriptions plan.
--
-- Covers:
--   * New table Subscription (one row per customer subscription: customer +
--     shipping-address snapshot, locked cadence/pricing, Stripe ids,
--     lifecycle status; encrypted customer/shipping snapshot fields)
--   * Order.stripeInvoiceId (unique — set only for subscription-billed
--     orders; every paid invoice, first + renewal, creates a normal Order)
--     and Order.subscriptionId (+ index) linking an order back to the
--     subscription that produced it
--   * Customer.stripeCustomerId (per-business Stripe Customer on the
--     connected account)
--   * Product.subscriptionEnabled / .subscriptionIntervals /
--     .subscriptionDiscountPercent (owner-configured "subscribe & save")
--   * Business.stripePortalConfigurationId (cached Stripe Customer Portal
--     configuration on the connected account, for the "update payment
--     method" deep link)
--
-- UNLIKE 2026-08-24-quickbooks.sql, this file ALTERs four existing tables
-- (Order, Customer, Product, Business) in addition to creating one new
-- table. Every ALTER TABLE here adds a nullable-or-defaulted column only —
-- no ALTER COLUMN, no table rewrite, no backfill, no data change to any
-- existing row. Safe to run against a live database.
--
-- Hand-apply only. Nothing runs this automatically; there is no migration
-- file backing it (this repo's Prisma migration baseline is broken — see
-- project memory — so the process is hand-apply / db-push, not
-- `migrate dev`).
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-08-25-subscriptions.sql
--
-- Idempotent: every statement is guarded (ADD COLUMN IF NOT EXISTS, CREATE
-- TABLE IF NOT EXISTS, CREATE [UNIQUE] INDEX IF NOT EXISTS, and the foreign
-- keys are wrapped in DO blocks that check pg_constraint first), so a second
-- run is a no-op.
--
-- CHECKLIST: apply this to staging/prod BEFORE deploying the subscriptions
-- feature. The subscribe checkout route, webhook, cron sync, and admin
-- subscriptions screens all read/write these columns/table — on a database
-- missing them, every one of those paths throws against columns Prisma's
-- generated client believes exist. The feature is flag-gated
-- (`subscriptions`, default off) so applying this file alone does not turn
-- anything on for existing stores.
--
-- NOTE: "updatedAt" columns have no DEFAULT by design — this matches what
-- `prisma db push` emits for `@updatedAt` fields: the Prisma client sets the
-- value on every create/update, so there is no DB-side default.

-- ----------------------------------------------------------------------------
-- Existing-table columns (Business, Customer, Product, Order)
-- ----------------------------------------------------------------------------

-- AlterTable: Business
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "stripePortalConfigurationId" TEXT;

-- AlterTable: Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

-- AlterTable: Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "subscriptionEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "subscriptionIntervals" JSONB;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "subscriptionDiscountPercent" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Order (stripeInvoiceId only here — subscriptionId + its index
-- and FK are added below, after the Subscription table exists)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stripeInvoiceId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "subscriptionId" TEXT;

-- CreateIndex: unique — one Order per paid invoice (idempotency key for
-- invoice.paid handling; also enforced app-side via findUnique before create)
CREATE UNIQUE INDEX IF NOT EXISTS "Order_stripeInvoiceId_key" ON "Order"("stripeInvoiceId");

-- CreateIndex: subscription -> orders fan-out (admin order detail badge, manage page)
CREATE INDEX IF NOT EXISTS "Order_subscriptionId_idx" ON "Order"("subscriptionId");

-- ----------------------------------------------------------------------------
-- Subscription (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: Subscription
-- One row per customer subscription. Product/pricing/cadence/shipping-address
-- are a snapshot taken at signup and never mutated in place (cancel +
-- resubscribe instead) — see the doc comment on the model in schema.prisma.
-- Encrypted columns (customer + shipping snapshot) never appear in app-side
-- WHERE clauses; lookups use the plaintext customerEmail + businessId.
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    "businessId" TEXT NOT NULL,
    "customerId" TEXT,

    "customerEmail" TEXT NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,

    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "lastInvoiceId" TEXT,

    "productId" TEXT,
    "productVariantId" TEXT,
    "productName" TEXT NOT NULL,
    "variantName" TEXT,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,

    "intervalKey" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "intervalCount" INTEGER NOT NULL,
    "listPriceCents" INTEGER NOT NULL,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "unitAmountCents" INTEGER NOT NULL,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "deliveryMethod" TEXT NOT NULL DEFAULT 'ship',

    "shippingAddressId" TEXT,
    "shipFirstName" TEXT,
    "shipLastName" TEXT,
    "shipAddress1" TEXT,
    "shipAddress2" TEXT,
    "shipCity" TEXT,
    "shipProvince" TEXT,
    "shipZip" TEXT,
    "shipCountry" TEXT,

    "status" TEXT NOT NULL DEFAULT 'incomplete',
    "pauseResumesAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "nextBillingAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "lastPaymentFailedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),

    "termsAcceptedAt" TIMESTAMP(3),
    "termsVersion" TEXT,
    "merchantTermsUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique — one local row per Stripe Subscription
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex: unique — one local row per Checkout Session (success-page lookup)
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeCheckoutSessionId_key" ON "Subscription"("stripeCheckoutSessionId");

-- CreateIndex: admin list + cron scope (active|past_due|paused|incomplete)
CREATE INDEX IF NOT EXISTS "Subscription_businessId_status_idx" ON "Subscription"("businessId", "status");

-- CreateIndex: manage-link lookup (requestManageLinks by email, per business)
CREATE INDEX IF NOT EXISTS "Subscription_businessId_customerEmail_idx" ON "Subscription"("businessId", "customerEmail");

-- CreateIndex: SetNull fan-out + signed-in account page (getMine)
CREATE INDEX IF NOT EXISTS "Subscription_customerId_idx" ON "Subscription"("customerId");

-- CreateIndex: cron sweep — open subscriptions, stalest lastSyncedAt first
CREATE INDEX IF NOT EXISTS "Subscription_status_lastSyncedAt_idx" ON "Subscription"("status", "lastSyncedAt");

-- CreateIndex: SetNull fan-out on product delete
CREATE INDEX IF NOT EXISTS "Subscription_productId_idx" ON "Subscription"("productId");

-- ----------------------------------------------------------------------------
-- Foreign keys
-- ----------------------------------------------------------------------------

-- AddForeignKey: Subscription -> Business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_businessId_fkey'
  ) THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: Subscription -> Customer
-- SetNull, not Cascade: a subscription (and the orders it produced) is a
-- money record and must outlive the Customer row if that's ever deleted.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_customerId_fkey'
  ) THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: Subscription -> Product
-- SetNull: a subscription outlives a deleted product; product fields are
-- already snapshotted onto the row (productName/variantName/sku).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_productId_fkey'
  ) THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: Subscription -> ProductVariant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_productVariantId_fkey'
  ) THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_productVariantId_fkey"
      FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: Subscription -> ShippingAddress
-- SetNull: the address-book entry may be edited/deleted later without
-- touching what a live subscription bills/ships to (address is snapshotted
-- onto the encrypted ship* columns above).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_shippingAddressId_fkey'
  ) THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_shippingAddressId_fkey"
      FOREIGN KEY ("shippingAddressId") REFERENCES "ShippingAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: Order -> Subscription
-- SetNull: an order (money record, already fulfilled/paid) must outlive the
-- subscription that produced it if the subscription row is ever removed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_subscriptionId_fkey'
  ) THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_subscriptionId_fkey"
      FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
