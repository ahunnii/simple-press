-- ============================================================================
-- P2 schema integrity fixes
-- ============================================================================

-- data-layer#1: index Order.stripePaymentIntentId (dispute/refund webhook findFirst)
-- CreateIndex
CREATE INDEX "Order_stripePaymentIntentId_idx" ON "Order"("stripePaymentIntentId");

-- ----------------------------------------------------------------------------
-- data-layer#3: preserve the inventory audit trail when a variant is deleted.
-- Was ON DELETE CASCADE, which destroyed variant-level history. Match the
-- SetNull intent already used on the product link.
-- DropForeignKey
ALTER TABLE "InventoryHistory" DROP CONSTRAINT "InventoryHistory_variantId_fkey";

-- AddForeignKey
ALTER TABLE "InventoryHistory" ADD CONSTRAINT "InventoryHistory_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- data-layer#2: add referential integrity + cascade to BackInStockRequest.
-- businessId / productId were bare String columns with no FK.
-- Because these columns previously had no FK, orphan rows (referencing a
-- product/business that was since hard-deleted) may exist and would make the
-- ADD CONSTRAINT below abort. An orphaned back-in-stock request can never be
-- fulfilled (its product/business is gone), so delete such rows first.
DELETE FROM "BackInStockRequest" b
  WHERE NOT EXISTS (SELECT 1 FROM "Product" p WHERE p."id" = b."productId")
     OR NOT EXISTS (SELECT 1 FROM "Business" bu WHERE bu."id" = b."businessId");

-- AddForeignKey
ALTER TABLE "BackInStockRequest" ADD CONSTRAINT "BackInStockRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackInStockRequest" ADD CONSTRAINT "BackInStockRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- data-layer#4: ReviewVote dedup bypass. Plain multi-column UNIQUE indexes treat
-- NULLs as distinct, so rows with a NULL userId (anonymous votes) or NULL
-- ipAddress could duplicate. Replace with PARTIAL unique indexes that only apply
-- when the identifying column is present. This keeps "one vote per authenticated
-- user per review" AND "one vote per IP per review" without conflating NULLs
-- (two different anonymous voters legitimately both have userId = NULL).
-- DropIndex
DROP INDEX "ReviewVote_reviewId_userId_key";

-- DropIndex
DROP INDEX "ReviewVote_reviewId_ipAddress_key";

-- CreateIndex
CREATE UNIQUE INDEX "ReviewVote_reviewId_userId_key" ON "ReviewVote"("reviewId", "userId") WHERE "userId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ReviewVote_reviewId_ipAddress_key" ON "ReviewVote"("reviewId", "ipAddress") WHERE "ipAddress" IS NOT NULL;
