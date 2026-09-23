import { notFound } from "next/navigation";

import type { FormDefinition } from "~/lib/validators/form";
import { isFormChoiceField } from "~/lib/validators/form";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import {
  FORM_STATUS_FILTER_VALUES,
  type FormStatusFilterValue,
} from "~/lib/validators/form";
import { api } from "~/trpc/server";

import { TrailHeader } from "../../../_components/trail-header";
import { parsePageParam, pickParam } from "../../../_lib/table-query";
import { EntriesClient } from "./_components/entries-client";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    search?: string;
    status?: string;
    tags?: string;
    from?: string;
    to?: string;
    filterField?: string;
    filterValue?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 25;

/** `?tags=a,b,c` → `["a","b","c"]`, dropping blanks. `undefined` when absent. */
function parseTagsParam(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const tags = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : undefined;
}

/** `?from=YYYY-MM-DD` → local-midnight `Date`, or `undefined` when absent/invalid. */
function parseDateParam(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** End-of-day for an inclusive `to` bound, so `?to=2026-09-23` includes that whole day. */
function parseDateParamEnd(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const date = new Date(`${raw}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function FormEntriesPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  // Same guard `/admin/layout.tsx` already ran, resolved again for the
  // owner-only bulkDelete gate — mirrors the quotes inbox's `canBulkDelete`.
  const { session, membershipRole } = await requireAdminAccess();
  const canBulkDelete =
    session.user.platformRole === "PLATFORM_ADMIN" ||
    membershipRole === "OWNER";

  const form = await api.form.getById({ id }).catch(rethrowTrpcForErrorBoundary);
  if (!form) notFound();

  // A corrupted/legacy definition still opens (definitionValid === false) —
  // the entries table just loses its field-derived columns and filters.
  // `definitionValid` and `definition` aren't a discriminated union TS can
  // narrow together (they're two separate fields on the router's return
  // type), hence the one cast — safe because `definitionValid` is exactly
  // `parseStoredFormDefinition(...).success`.
  const fields = form.definitionValid
    ? (form.definition as FormDefinition).fields
    : [];
  const filterableFields = fields.filter(
    (field) => isFormChoiceField(field) || field.type === "checkbox",
  );

  const search = sp.search?.trim() ?? "";
  const status = pickParam(
    sp.status,
    FORM_STATUS_FILTER_VALUES,
    "ALL" satisfies FormStatusFilterValue,
  );
  const tags = parseTagsParam(sp.tags);
  const from = parseDateParam(sp.from);
  const to = parseDateParamEnd(sp.to);
  const filterField = sp.filterField
    ? filterableFields.find((f) => f.id === sp.filterField)
    : undefined;
  const fieldFilter =
    filterField && sp.filterValue
      ? { fieldId: filterField.id, value: sp.filterValue }
      : undefined;
  const requestedPage = parsePageParam(sp.page);

  const [result, tagOptions] = await Promise.all([
    api.formSubmission
      .list({
        formId: id,
        status,
        tags,
        from,
        to,
        search: search || undefined,
        fieldFilter,
        page: requestedPage,
        pageSize: PAGE_SIZE,
      })
      .catch(rethrowTrpcForErrorBoundary),
    api.formSubmission.listTags({ formId: id }).catch(rethrowTrpcForErrorBoundary),
  ]);

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Forms", href: "/admin/forms" },
          { label: form.name, href: `/admin/forms/${id}` },
          { label: "Entries" },
        ]}
      />
      <EntriesClient
        formId={id}
        formName={form.name}
        totalEntries={form.totalEntries}
        fields={fields}
        filterableFields={filterableFields}
        tagOptions={tagOptions}
        items={result.items}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        scanCapped={result.scanCapped}
        canBulkDelete={canBulkDelete}
      />
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const form = await api.form.getById({ id }).catch(rethrowTrpcForErrorBoundary);
  if (!form) return { title: "Entries" };
  return { title: `${form.name} — Entries` };
}
