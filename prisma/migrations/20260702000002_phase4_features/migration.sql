-- AlterEnum
ALTER TYPE "BusinessRole" ADD VALUE 'STAFF';

-- AlterTable
ALTER TABLE "OrderShipment" ADD COLUMN "items" JSONB;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "fulfilledQuantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SiteContent" ADD COLUMN "emailOverrides" JSONB;

-- CreateTable
CREATE TABLE "BackInStockRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "businessId" TEXT NOT NULL,

    CONSTRAINT "BackInStockRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackInStockRequest_businessId_productId_idx" ON "BackInStockRequest"("businessId", "productId");

-- CreateIndex
CREATE INDEX "BackInStockRequest_notifiedAt_productId_idx" ON "BackInStockRequest"("notifiedAt", "productId");
