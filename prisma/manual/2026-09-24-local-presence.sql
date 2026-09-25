-- 2026-09-24-local-presence.sql — 2026-09-24
--
-- Replaces the boolean LocalBusiness opt-in with a three-way local-presence
-- mode, and adds an owner-listed "areas served" list.
--
-- Covers:
--   * Business."localPresence" — 'none' | 'service_area' | 'storefront'.
--     'storefront' emits today's `Store` JSON-LD (full street address);
--     'service_area' emits `LocalBusiness` with city/state only (no street) for
--     businesses without a public location. Read by `buildLocalBusinessSchema`
--     (src/lib/structured-data.ts), the SEO scorecard, and the SEO editor.
--   * Business."areaServed" — TEXT[] of cities/regions, emitted as `areaServed`.
--
-- No data backfill: existing rows land on 'none'. Stores that had
-- `localBusinessEnabled = true` are switched to Storefront by hand in the SEO
-- editor after deploy — list them with:
--   SELECT subdomain FROM "Business" WHERE "localBusinessEnabled";
--
-- `Business."localBusinessEnabled"` is left in place (no longer read) and will
-- be dropped in a later pass.
--
-- `pnpm db:push` produces the same columns; this file is only needed where
-- db push isn't used. Either way, the columns must exist BEFORE deploying —
-- the generated client selects both on tenant reads.
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-09-24-local-presence.sql
--
-- Idempotent: ADDs are guarded with IF NOT EXISTS.

ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "localPresence" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "areaServed" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

