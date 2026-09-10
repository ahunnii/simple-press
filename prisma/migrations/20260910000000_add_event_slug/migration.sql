-- Event gains a business-scoped `slug`, matching Service/Collection/Gallery.
-- Added nullable first, backfilled from `name`, then tightened to NOT NULL so the
-- migration is safe against a live table with existing rows.

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "slug" TEXT;

-- ----------------------------------------------------------------------------
-- Backfill. The expression below is the SQL twin of `generateCollectionSlug`
-- (src/lib/slug.ts): lowercase, collapse every non-alphanumeric run to a single
-- '-', strip leading/trailing '-'. Names that slugify to nothing ("", "!!!")
-- fall back to 'event' — the TS helper returns "" there, but an empty slug is
-- useless in a URL and would collide under the unique index, so the fallback is
-- deliberate and the de-dup pass below numbers the collisions.
--
-- ROW_NUMBER de-duplicates within a business: the first row (oldest, id as the
-- tiebreak) keeps the bare slug, later ones get "-2", "-3", ….
WITH slugged AS (
    SELECT
        "id",
        "businessId",
        "createdAt",
        COALESCE(NULLIF(trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')), ''), 'event') AS base_slug
    FROM "Event"
),
ranked AS (
    SELECT
        "id",
        base_slug,
        ROW_NUMBER() OVER (PARTITION BY "businessId", base_slug ORDER BY "createdAt", "id") AS rn
    FROM slugged
)
UPDATE "Event" e
SET "slug" = CASE WHEN r.rn = 1 THEN r.base_slug ELSE r.base_slug || '-' || r.rn END
FROM ranked r
WHERE e."id" = r."id";

-- ----------------------------------------------------------------------------
-- Defensive second pass. The numeric suffix above can land on a slug a *different*
-- event already owns: two events named "foo" produce "foo" and "foo-2", which
-- collides with an event literally named "foo 2". Any residual duplicate within a
-- business gets its id appended (ids are unique, so this always resolves); the
-- lowest-id row of each duplicate set keeps the clean slug.
UPDATE "Event" e
SET "slug" = e."slug" || '-' || e."id"
WHERE EXISTS (
    SELECT 1 FROM "Event" o
    WHERE o."businessId" = e."businessId"
      AND o."slug" = e."slug"
      AND o."id" < e."id"
);

-- ----------------------------------------------------------------------------
-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Event_businessId_slug_key" ON "Event"("businessId", "slug");
