-- ============================================================================
-- Artisanal Futures provisioning idempotency key
-- ============================================================================
-- Adds Business.afProvisionCode — the AF WebsiteProvision.accessToken echoed
-- by the partner provisioning API (POST /api/partner/provision) and used as
-- its idempotency key. See docs/integrations/artisanal-futures-provisioning.md.
--
-- NOTE: `prisma migrate dev` originally bundled re-creations of the
-- BackInStockRequest and ReviewVote unique indexes into this migration. That
-- is permanent, intentional drift: p2_schema_integrity and
-- p4_backinstock_unique created those as PARTIAL unique indexes, which Prisma
-- cannot express, so drift detection will always try to re-add them as plain
-- uniques. They must NOT be recreated (the partial behavior is load-bearing).
-- Apply hand-trimmed migrations like this one with `prisma migrate deploy`.
-- ----------------------------------------------------------------------------

-- AlterTable
ALTER TABLE "Business" ADD COLUMN "afProvisionCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Business_afProvisionCode_key" ON "Business"("afProvisionCode");
