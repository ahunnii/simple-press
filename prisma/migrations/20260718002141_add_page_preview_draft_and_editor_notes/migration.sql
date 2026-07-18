-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "previewDraft" JSONB,
ADD COLUMN     "previewDraftUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EditorNote" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessId" TEXT NOT NULL,
    "pageKey" TEXT,
    "pageLabel" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "response" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,

    CONSTRAINT "EditorNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EditorNote_businessId_status_idx" ON "EditorNote"("businessId", "status");

-- CreateIndex
CREATE INDEX "EditorNote_status_createdAt_idx" ON "EditorNote"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "EditorNote" ADD CONSTRAINT "EditorNote_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorNote" ADD CONSTRAINT "EditorNote_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
