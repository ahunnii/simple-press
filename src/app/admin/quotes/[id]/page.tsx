import { notFound } from "next/navigation";
import { z } from "zod";

import type { QuoteStatusDb } from "~/lib/validators/quote-calculator";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import {
  QUOTE_STATUS_VALUES_DB,
  quoteFormulaSnapshotSchema,
  quoteSubmissionAnswerSchema,
} from "~/lib/validators/quote-calculator";
import { api } from "~/trpc/server";

import { QuoteDetail } from "../_components/quote-detail";
import { TrailHeader } from "../../_components/trail-header";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Same one-unavoidable-cast idiom as `toQuoteStatus` in `../page.tsx`. */
function toQuoteStatus(status: string): QuoteStatusDb {
  const values: readonly string[] = QUOTE_STATUS_VALUES_DB;
  return values.includes(status) ? (status as QuoteStatusDb) : "NEW";
}

export default async function QuoteDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Same guard `/admin/layout.tsx` already ran, called again for its
  // resolved `membershipRole` — decides whether the delete action shows at
  // all. Mirrors `ownerOnlyProcedure`, which `quoteSubmission.bulkDelete`
  // uses: PLATFORM_ADMIN bypasses the membership check, everyone else needs
  // OWNER.
  const { session, membershipRole } = await requireAdminAccess();
  const canDelete =
    session.user.platformRole === "PLATFORM_ADMIN" ||
    membershipRole === "OWNER";

  const submission = await api.quoteSubmission
    .getById({ id })
    .catch(rethrowTrpcForErrorBoundary);

  if (!submission) notFound();

  // `answers` and `formulaSnapshot` are stored as `Json` and were valid
  // against these schemas at write time (`quote-submission.ts`'s `submit`
  // builds them from `computeQuote`'s output) — but a Json column has no
  // schema enforcement of its own, so a row written before a shape change,
  // or corrupted by hand, is parsed defensively rather than trusted. On
  // failure the detail page renders gracefully (empty answers list / no
  // formula snapshot) instead of 500ing the whole page.
  const answersResult = z
    .array(quoteSubmissionAnswerSchema)
    .safeParse(submission.answers);
  const formulaResult = quoteFormulaSnapshotSchema.safeParse(
    submission.formulaSnapshot,
  );

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Quotes", href: "/admin/quotes" },
          { label: submission.contactName },
        ]}
      />
      <QuoteDetail
        submission={{
          id: submission.id,
          contactName: submission.contactName,
          contactEmail: submission.contactEmail,
          contactPhone: submission.contactPhone,
          calculatorName: submission.calculatorName,
          calculatorId: submission.calculatorId,
          estimateCents: submission.estimateCents,
          finalQuoteCents: submission.finalQuoteCents,
          quoteSentAt: submission.quoteSentAt,
          sentQuoteCents: submission.sentQuoteCents,
          sentMessage: submission.sentMessage,
          showEstimateToCustomer: submission.showEstimateToCustomer,
          status: toQuoteStatus(submission.status),
          createdAt: submission.createdAt,
        }}
        answers={answersResult.success ? answersResult.data : []}
        answersParseFailed={!answersResult.success}
        formulaSnapshot={formulaResult.success ? formulaResult.data : null}
        formulaParseFailed={!formulaResult.success}
        canDelete={canDelete}
      />
    </>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const submission = await api.quoteSubmission
    .getById({ id })
    .catch(rethrowTrpcForErrorBoundary);
  if (!submission) return { title: "Quote" };
  return { title: submission.contactName };
}
