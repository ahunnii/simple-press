-- Events feature. Purely additive: one new column with a default, one new table.
-- Safe to apply to a live database — no drops, no rewrites of existing rows
-- beyond the constant default backfill on Business.timeZone.

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "timeZone" TEXT NOT NULL DEFAULT 'America/Detroit';

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "blurb" TEXT,
    "coverImage" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "externalUrl" TEXT,
    "externalUrlLabel" TEXT,
    "priceLabel" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_businessId_published_isArchived_startAt_idx" ON "Event"("businessId", "published", "isArchived", "startAt");

-- CreateIndex
CREATE INDEX "Event_businessId_startAt_idx" ON "Event"("businessId", "startAt");

-- CreateIndex
CREATE INDEX "Event_isArchived_endAt_idx" ON "Event"("isArchived", "endAt");

-- CreateIndex
CREATE INDEX "Event_isArchived_startAt_idx" ON "Event"("isArchived", "startAt");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
