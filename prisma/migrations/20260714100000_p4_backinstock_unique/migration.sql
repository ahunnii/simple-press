-- ============================================================================
-- P4 back-in-stock dedup unique constraint
-- ============================================================================
-- Previously, dedup for "notify me when back in stock" signups relied entirely
-- on app code (subscribe's findFirst). A race (two concurrent requests) or a
-- bug could still create duplicate rows. Add a DB-level UNIQUE on
-- (businessId, productId, variantId, email) to enforce one PENDING signup per
-- email + product + variant per business.
--
-- PARTIAL index (`WHERE "notifiedAt" IS NULL`): the cron keeps notified rows
-- (sets notifiedAt, never deletes), and a shopper who was already notified
-- must be able to subscribe AGAIN when the item sells out later. A plain
-- UNIQUE would make that re-subscribe collide with the old notified row and
-- silently never re-notify them. Same technique as ReviewVote's partial
-- uniques in p2_schema_integrity; Prisma can't express partial indexes, so
-- schema.prisma keeps a matching @@unique only for generated-client types.
--
-- NOTE: Postgres treats NULLs as distinct in a plain UNIQUE index, so this
-- constraint does NOT dedup variant-less signups (variantId IS NULL) — those
-- remain deduped by app code only.
-- ----------------------------------------------------------------------------

-- The UNIQUE index will abort if pre-existing duplicate rows already exist.
-- Delete older duplicates first, keeping the newest row per group (matching the
-- pattern used in p2 for orphan FK rows). Only variant-specified PENDING rows
-- can actually collide (NULLs are distinct; notified rows are outside the
-- partial index), so we scope the dedup to those.
DELETE FROM "BackInStockRequest"
  WHERE "id" IN (
    SELECT "id" FROM (
      SELECT "id",
        ROW_NUMBER() OVER (
          PARTITION BY "businessId", "productId", "variantId", "email"
          ORDER BY "createdAt" DESC, "id" DESC
        ) AS rn
      FROM "BackInStockRequest"
      WHERE "variantId" IS NOT NULL AND "notifiedAt" IS NULL
    ) ranked
    WHERE ranked.rn > 1
  );

-- CreateIndex (partial — one pending request per group; notified history rows
-- never conflict, so re-subscribing after a notification works)
CREATE UNIQUE INDEX "BackInStockRequest_businessId_productId_variantId_email_key" ON "BackInStockRequest"("businessId", "productId", "variantId", "email") WHERE "notifiedAt" IS NULL;
