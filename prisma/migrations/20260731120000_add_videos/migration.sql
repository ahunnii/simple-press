-- YouTube videos feature. Purely additive: two new tables, no changes to any
-- existing table. Safe to apply to a live database — no drops, no column
-- rewrites, no backfills.

-- CreateTable
CREATE TABLE "VideoSource" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "label" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "autoPublish" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "VideoSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "channelTitle" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "titleOverride" TEXT,
    "descriptionOverride" TEXT,
    "thumbnailOverride" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "sourceId" TEXT,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoSource_businessId_kind_externalId_key" ON "VideoSource"("businessId", "kind", "externalId");

-- CreateIndex
CREATE INDEX "VideoSource_enabled_lastSyncedAt_idx" ON "VideoSource"("enabled", "lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Video_businessId_youtubeId_key" ON "Video"("businessId", "youtubeId");

-- CreateIndex
CREATE INDEX "Video_businessId_published_publishedAt_idx" ON "Video"("businessId", "published", "publishedAt");

-- CreateIndex
CREATE INDEX "Video_businessId_sortOrder_idx" ON "Video"("businessId", "sortOrder");

-- AddForeignKey
ALTER TABLE "VideoSource" ADD CONSTRAINT "VideoSource_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "VideoSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
