-- 2026-09-14-seo-brand-address.sql — 2026-09-14
--
-- Additive DDL for the SEO title-suffix rule and the structured LocalBusiness
-- address: one new nullable column on SiteContent, four on Business.
--
-- Covers:
--   * SiteContent."seoBrandName" — short brand appended to every page title as
--     " | Brand" (`renderSeoTitle`, src/lib/seo/title.ts); NULL → Business.name.
--     Written only by `business.updateSeo`.
--   * Business."addressStreet" / "addressCity" / "addressState" /
--     "addressPostalCode" — structured address parts. They feed the
--     `PostalAddress` in LocalBusiness JSON-LD (`buildLocalBusinessSchema`) and
--     the scorecard's local-address check. `Business."businessAddress"` stays
--     the display string every template renders; `business.updateGeneral`
--     recomputes it from these parts on save.
--
-- Hand-apply only. Nothing runs this automatically; there is no migration
-- file backing it. Strictly additive — five ADD COLUMN, no DROP, no data
-- rewrite, no index change. Safe to run against a live database.
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-09-14-seo-brand-address.sql
--
-- Idempotent: the statements are guarded with IF NOT EXISTS, so a second run
-- is a no-op.
--
-- CHECKLIST: apply this to staging/prod BEFORE deploying the SEO pass. The
-- generated client selects `seoBrandName` on every tenant read
-- (`business.simplifiedGet`) once it ships; against a database missing the
-- column, every storefront route throws.
--
-- NOTE: all columns nullable with no DEFAULT by design — this matches what
-- `prisma db push` emits for optional String fields. Existing rows keep NULL
-- (title suffix falls back to Business.name; the address schema falls back to
-- the legacy free-text `businessAddress`).

-- ----------------------------------------------------------------------------
-- SiteContent: title-suffix brand
-- ----------------------------------------------------------------------------

ALTER TABLE "SiteContent" ADD COLUMN IF NOT EXISTS "seoBrandName" TEXT;

-- ----------------------------------------------------------------------------
-- Business: structured address parts
-- ----------------------------------------------------------------------------

ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "addressStreet" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "addressCity" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "addressState" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "addressPostalCode" TEXT;
