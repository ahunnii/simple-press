-- 2026-10-19-review-owner-reply.sql — 2026-10-19
--
-- Hand-apply record for the owner's public reply on a product review. Adds the
-- reply text, its first-posted timestamp, and the admin-only "who replied"
-- foreign key to "ProductReview". For environments that don't use `prisma db
-- push`, this file is the record of what to run; the Prisma schema is the
-- source of truth.
--
-- Covers:
--   * "ownerReply" / "ownerReplyAt" / "ownerReplyById" columns on
--     "ProductReview" (matches the Prisma fields ownerReply, ownerReplyAt,
--     ownerReplyById on model ProductReview).
--   * "ProductReview_ownerReplyById_fkey" -> "user"("id"), ON DELETE SET NULL.
--     The User model is @@map("user"), so the referenced table is "user".
--   * "ProductReview_ownerReplyById_idx" on ("ownerReplyById").
--
-- Idempotent: safe to re-run.

ALTER TABLE "ProductReview" ADD COLUMN IF NOT EXISTS "ownerReply" TEXT;
ALTER TABLE "ProductReview" ADD COLUMN IF NOT EXISTS "ownerReplyAt" TIMESTAMP(3);
ALTER TABLE "ProductReview" ADD COLUMN IF NOT EXISTS "ownerReplyById" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductReview_ownerReplyById_fkey'
  ) THEN
    ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_ownerReplyById_fkey"
      FOREIGN KEY ("ownerReplyById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ProductReview_ownerReplyById_idx"
  ON "ProductReview" ("ownerReplyById");
