import { notFound } from "next/navigation";

import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { FORM_SOURCE_VALUES, FORM_STATUS_VALUES } from "~/lib/validators/form";
import { api } from "~/trpc/server";

import { TrailHeader } from "../../../../_components/trail-header";
import { EntryDetail } from "./_components/entry-detail";

type PageProps = {
  params: Promise<{ id: string; entryId: string }>;
};

/** `status`/`source` are plain `String` columns (not DB enums, same reasoning
 *  as `QuoteSubmission.status` — see `toQuoteStatus` in the quotes list page),
 *  written exclusively through validated procedures. Falls back to the safe
 *  default rather than throwing on a corrupted row. */
function toFormStatus(status: string): "NEW" | "READ" | "ARCHIVED" {
  const values: readonly string[] = FORM_STATUS_VALUES;
  return values.includes(status) ? (status as "NEW" | "READ" | "ARCHIVED") : "NEW";
}

function toFormSource(source: string): "WEB" | "IMPORT" {
  const values: readonly string[] = FORM_SOURCE_VALUES;
  return values.includes(source) ? (source as "WEB" | "IMPORT") : "WEB";
}

export default async function FormEntryDetailPage({ params }: PageProps) {
  const { id, entryId } = await params;

  // Same guard the quote detail page uses for its owner-only Delete: mirrors
  // `formSubmission.bulkDelete`'s `ownerOnlyProcedure`.
  const { session, membershipRole } = await requireAdminAccess();
  const canDelete =
    session.user.platformRole === "PLATFORM_ADMIN" ||
    membershipRole === "OWNER";

  // `getById` marks the entry READ as a side effect when it was NEW — see
  // `EntryDetail`'s mount-time invalidation, which keeps the list page's
  // unread badge from going stale after this render.
  const submission = await api.formSubmission
    .getById({ id: entryId })
    .catch(rethrowTrpcForErrorBoundary);

  if (submission?.formId !== id) notFound();

  const currentFieldIds = new Set(
    submission.definition?.fields.map((field) => field.id) ?? [],
  );

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Forms", href: "/admin/forms" },
          { label: submission.formName, href: `/admin/forms/${id}` },
          { label: "Entries", href: `/admin/forms/${id}/entries` },
          { label: `Entry — ${new Date(submission.submittedAt).toLocaleDateString()}` },
        ]}
      />
      <EntryDetail
        formId={id}
        entry={{
          id: submission.id,
          submittedAt: submission.submittedAt,
          status: toFormStatus(submission.status),
          tags: submission.tags,
          source: toFormSource(submission.source),
          answers: submission.answers,
        }}
        currentFieldIds={currentFieldIds}
        canDelete={canDelete}
      />
    </>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { entryId } = await params;
  const submission = await api.formSubmission
    .getById({ id: entryId })
    .catch(rethrowTrpcForErrorBoundary);
  if (!submission) return { title: "Entry" };
  return { title: `${submission.formName} — Entry` };
}
