-- ============================================================================
-- P3 index hygiene
-- ============================================================================
-- Keeps schema.prisma and the DB in sync for three classes of index fixes:
--   data-layer#3: add missing indexes on foreign-key columns (Postgres does NOT
--                 auto-index FKs) — hot auth/order paths + referential-delete scans.
--   data-layer#2: drop redundant single-column @@index that duplicate a @unique
--                 (a UNIQUE constraint already creates a covering index).
--   data-layer#4: drop redundant single-column @@index covered by the leading
--                 column of a composite @@unique/@@index.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- data-layer#3: add indexes on unindexed foreign-key columns
-- ----------------------------------------------------------------------------

-- Session.userId — hot auth path (session lookups by user); was unindexed.
-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- Account.userId — hot auth path (provider accounts by user); was unindexed.
-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- Product.baseInventoryUnitId — pool-inventory FK (SetNull); products-in-pool
-- queries + delete scans.
-- CreateIndex
CREATE INDEX "Product_baseInventoryUnitId_idx" ON "Product"("baseInventoryUnitId");

-- Order.shippingAddressId — FK (SetNull); scanned when an address is deleted.
-- CreateIndex
CREATE INDEX "Order_shippingAddressId_idx" ON "Order"("shippingAddressId");

-- Order.discountCodeId — FK (SetNull); scanned when a discount code is deleted.
-- CreateIndex
CREATE INDEX "Order_discountCodeId_idx" ON "Order"("discountCodeId");

-- OrderItem.productVariantId — FK (SetNull); scanned when a variant is deleted.
-- CreateIndex
CREATE INDEX "OrderItem_productVariantId_idx" ON "OrderItem"("productVariantId");

-- InventoryHistory.userId — FK (SetNull); who-made-the-change lookups + delete scans.
-- CreateIndex
CREATE INDEX "InventoryHistory_userId_idx" ON "InventoryHistory"("userId");

-- TestimonialInvite.customerId — FK (SetNull); scanned when a customer is deleted.
-- CreateIndex
CREATE INDEX "TestimonialInvite_customerId_idx" ON "TestimonialInvite"("customerId");

-- ProductReview.orderId — FK (SetNull); scanned when an order is deleted.
-- CreateIndex
CREATE INDEX "ProductReview_orderId_idx" ON "ProductReview"("orderId");

-- PlatformInvite.createdBy — FK (SetNull); scanned when the creating user is deleted.
-- CreateIndex
CREATE INDEX "PlatformInvite_createdBy_idx" ON "PlatformInvite"("createdBy");

-- BackInStockRequest.productId — FK (CASCADE, added in p2). Neither existing
-- composite index leads with productId, so cascade-delete + product lookups had
-- no covering index.
-- CreateIndex
CREATE INDEX "BackInStockRequest_productId_idx" ON "BackInStockRequest"("productId");

-- ----------------------------------------------------------------------------
-- data-layer#2: drop @@index that duplicate an existing @unique on the same column
-- ----------------------------------------------------------------------------

-- Business.subdomain / .customDomain are each @unique (own index).
-- DropIndex
DROP INDEX "Business_subdomain_idx";

-- DropIndex
DROP INDEX "Business_customDomain_idx";

-- TestimonialInvite.code / PlatformInvite.code / TeamInvite.code are each @unique.
-- DropIndex
DROP INDEX "TestimonialInvite_code_idx";

-- DropIndex
DROP INDEX "PlatformInvite_code_idx";

-- DropIndex
DROP INDEX "TeamInvite_code_idx";

-- InventoryReservation.stripeSessionId is @unique (own index).
-- DropIndex
DROP INDEX "InventoryReservation_stripeSessionId_idx";

-- ----------------------------------------------------------------------------
-- data-layer#4: drop single-column @@index covered by a composite unique/index prefix
-- ----------------------------------------------------------------------------

-- BusinessMembership.userId — covered by @@unique([userId, businessId]) prefix.
-- DropIndex
DROP INDEX "BusinessMembership_userId_idx";

-- Collection.businessId — covered by @@unique([businessId, slug]) prefix.
-- DropIndex
DROP INDEX "Collection_businessId_idx";

-- CollectionProduct.collectionId — covered by @@unique([collectionId, productId]) prefix.
-- DropIndex
DROP INDEX "CollectionProduct_collectionId_idx";

-- Customer.businessId — covered by @@unique([businessId, email]) prefix.
-- DropIndex
DROP INDEX "Customer_businessId_idx";

-- DiscountCode.businessId — covered by @@unique([businessId, code]) / @@index([businessId, active]) prefix.
-- DropIndex
DROP INDEX "DiscountCode_businessId_idx";

-- Gallery.businessId — covered by @@unique([businessId, slug]) prefix.
-- DropIndex
DROP INDEX "Gallery_businessId_idx";

-- ShippingZone.businessId — covered by @@unique([businessId, name]) prefix.
-- DropIndex
DROP INDEX "ShippingZone_businessId_idx";

-- ShippingRate.zoneId — covered by @@unique([zoneId, tierIndex]) prefix.
-- DropIndex
DROP INDEX "ShippingRate_zoneId_idx";
