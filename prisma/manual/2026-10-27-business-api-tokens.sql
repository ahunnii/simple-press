-- 2026-10-27-business-api-tokens.sql — 2026-10-27
--
-- Hand-apply record for owner-issued read-only API tokens (Business Profile
-- API, first consumer: ProfitMax). For environments that don't use
-- `prisma db push`, this file is the record of what to run; the Prisma schema
-- is the source of truth.
--
-- Covers:
--   * New table "BusinessApiToken" (sha256 token hash, display prefix, scopes,
--     lastUsedAt / revokedAt) with a unique index on "tokenHash", an index on
--     "businessId", and a cascading FK to "Business".
--
-- Strictly additive. Idempotent: safe to re-run.
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-10-27-business-api-tokens.sql
--
-- CHECKLIST: apply BEFORE deploying the Business Profile API; token auth reads
-- this table on every request.

CREATE TABLE IF NOT EXISTS "BusinessApiToken" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "BusinessApiToken_pkey" PRIMARY KEY ("id")
);

-- Auth lookup: where tokenHash
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessApiToken_tokenHash_key" ON "BusinessApiToken"("tokenHash");

-- Owner's token list
CREATE INDEX IF NOT EXISTS "BusinessApiToken_businessId_idx" ON "BusinessApiToken"("businessId");

-- AddForeignKey: BusinessApiToken → Business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BusinessApiToken_businessId_fkey'
  ) THEN
    ALTER TABLE "BusinessApiToken" ADD CONSTRAINT "BusinessApiToken_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
