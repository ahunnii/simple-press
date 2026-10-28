-- 2026-10-26-product-videos.sql — 2026-10-26
--
-- Hand-apply record for product gallery videos. Product galleries live in the
-- shared "Image" table; each row is now either a photo or a short video. For
-- environments that don't use `prisma db push`, this file is the record of
-- what to run; the Prisma schema is the source of truth.
--
-- Covers:
--   * enum "ImageMediaType" ('IMAGE', 'VIDEO') (matches Prisma enum
--     ImageMediaType).
--   * "mediaType" column on "Image", NOT NULL DEFAULT 'IMAGE' — existing rows
--     backfill to IMAGE through the default.
--   * "posterUrl" column on "Image" (still frame for VIDEO rows).
--
-- Idempotent: safe to re-run.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ImageMediaType') THEN
    CREATE TYPE "ImageMediaType" AS ENUM ('IMAGE', 'VIDEO');
  END IF;
END $$;

ALTER TABLE "Image" ADD COLUMN IF NOT EXISTS "mediaType" "ImageMediaType" NOT NULL DEFAULT 'IMAGE';
ALTER TABLE "Image" ADD COLUMN IF NOT EXISTS "posterUrl" TEXT;
