-- 2026-09-23-forms.sql — 2026-09-23
--
-- Additive DDL for owner-built forms embedded in CMS pages via the TipTap
-- `form` node: new Form table (owner-defined form definitions, one row per
-- form) and FormSubmission table (one row per form submission, with encrypted
-- answers).
--
-- Covers:
--   * Form — owner-built form definition (name, versioned JSON definition blob,
--     published state). Owner-scoped: every Business can have multiple forms.
--   * FormSubmission — one entry per form submission (encrypted answers,
--     plaintext status/tags/submittedAt for SQL-side filtering). Timestamps
--     are always UTC; answers are an encrypted JSON string of FormAnswerSnapshot[]
--     ({ fieldId, label, type, value }) so old entries still render after the
--     form is edited.
--
-- Hand-apply only. Nothing runs this automatically; there is no migration file
-- backing it. Strictly additive — two CREATE TABLE statements and their indexes,
-- no DROP, no data rewrite, no ALTER to existing tables. Safe to run against
-- a live database.
--
--   psql "$DATABASE_URL" -f prisma/manual/2026-09-23-forms.sql
--
-- Idempotent: the statements are guarded with CREATE TABLE IF NOT EXISTS and
-- CREATE INDEX IF NOT EXISTS, and the foreign keys are wrapped in DO blocks
-- that check pg_constraint first, so a second run is a no-op.
--
-- CHECKLIST: apply this to staging/prod BEFORE deploying the forms feature.
-- The form builder, form submission routes, and admin forms list all read/write
-- these tables — on a database missing them, every one of those paths throws
-- against tables Prisma's generated client believes exist.
--
-- NOTE: Form."definition" is JSONB, validated by `formDefinitionSchema` in
-- src/lib/validators/form.ts. FormSubmission."answers" is TEXT with @encrypted
-- annotation (prisma-field-encryption handles encryption/decryption). Search on
-- encrypted answers happens in-app after decryption; status/tags/submittedAt are
-- plaintext for SQL-side filtering. "updatedAt" columns have no DEFAULT by design
-- — this matches what `prisma db push` emits for `@updatedAt` fields: the Prisma
-- client sets the value on every create/update, so there is no DB-side default.

-- ----------------------------------------------------------------------------
-- Form (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: Form
-- Owner-built form definition: name, versioned JSON definition, published state.
-- One row per form per business.
CREATE TABLE IF NOT EXISTS "Form" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    "name" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,

    "businessId" TEXT NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: list forms per business (owner forms list, tiptap picker)
CREATE INDEX IF NOT EXISTS "Form_businessId_idx" ON "Form"("businessId");

-- ----------------------------------------------------------------------------
-- FormSubmission (new table)
-- ----------------------------------------------------------------------------

-- CreateTable: FormSubmission
-- One entry per form submission. Answers are encrypted; status/tags/submittedAt
-- are plaintext for SQL-side filtering (admin inbox queries).
CREATE TABLE IF NOT EXISTS "FormSubmission" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'WEB',

    "answers" TEXT NOT NULL,
    "submitterEmail" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

    "formName" TEXT NOT NULL,

    "formId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: admin list per form (most recent first, filter by status)
CREATE INDEX IF NOT EXISTS "FormSubmission_businessId_formId_submittedAt_idx" ON "FormSubmission"("businessId", "formId", "submittedAt");

-- CreateIndex: admin status filter per form
CREATE INDEX IF NOT EXISTS "FormSubmission_businessId_formId_status_idx" ON "FormSubmission"("businessId", "formId", "status");

-- CreateIndex: tag-based search/filter
CREATE INDEX IF NOT EXISTS "FormSubmission_tags_idx" ON "FormSubmission" USING GIN ("tags");

-- ----------------------------------------------------------------------------
-- Foreign keys
-- ----------------------------------------------------------------------------

-- AddForeignKey: Form -> Business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Form_businessId_fkey'
  ) THEN
    ALTER TABLE "Form" ADD CONSTRAINT "Form_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: FormSubmission -> Form
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FormSubmission_formId_fkey'
  ) THEN
    ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey"
      FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: FormSubmission -> Business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FormSubmission_businessId_fkey'
  ) THEN
    ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
