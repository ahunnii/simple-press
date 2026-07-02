-- AlterTable
ALTER TABLE "Business" ADD COLUMN "sendAbandonedCheckoutEmails" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "notes" TEXT;

-- AlterTable
ALTER TABLE "DiscountCode" ADD COLUMN "perCustomerLimit" INTEGER;

-- AlterTable
ALTER TABLE "Page" ADD COLUMN "scheduledPublishAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "scheduledPublishAt" TIMESTAMP(3);
