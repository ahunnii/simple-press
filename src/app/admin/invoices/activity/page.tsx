import { redirect } from "next/navigation";

import { isRealCalendarDate } from "~/lib/calendar-date";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { INVOICE_EVENT_TYPE_VALUES } from "~/lib/validators/invoice";
import { api } from "~/trpc/server";

import { InvoicesTabs } from "../_components/invoices-tabs";
import { TrailHeader } from "../../_components/trail-header";
import { canonicalPageHref, parsePageParam } from "../../_lib/table-query";
import { InvoiceActivityClient } from "./_components/invoice-activity-client";

type Props = {
  searchParams: Promise<{
    type?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: string;
  }>;
};

const BASE_PATH = "/admin/invoices/activity";

/** Matches the router's `search` max (`activityFiltersSchema`) — a pasted
 *  essay narrows instead of 400-ing the page. */
const SEARCH_MAX_LENGTH = 100;

/** `from`/`to` are free-typed `YYYY-MM-DD` — an invalid or partial date (a
 *  half-typed URL, a stale bookmark) is dropped rather than sent to the
 *  router, which would 400 the whole page. */
function pickDate(value: string | undefined): string | undefined {
  return value && isRealCalendarDate(value) ? value : undefined;
}

export default async function InvoiceActivityPage({ searchParams }: Props) {
  const params = await searchParams;

  // No layout.tsx gates `/admin/invoices`, and this page doesn't check the
  // `invoices` flag either: the log is history, and `activity` is an
  // ungated read — turning invoicing off must not hide it. The flag only
  // decides whether the route tabs render.
  await requireAdminAccess();
  const flags = await getBusinessFlags();

  // An unrecognized `type` falls back to "all" (undefined), like every other
  // narrowed filter in the admin.
  const type = INVOICE_EVENT_TYPE_VALUES.find((value) => value === params.type);
  const from = pickDate(params.from);
  const to = pickDate(params.to);
  const searchRaw = (params.search?.trim() ?? "").slice(0, SEARCH_MAX_LENGTH);
  const search = searchRaw === "" ? undefined : searchRaw;
  const requestedPage = parsePageParam(params.page) ?? 1;

  const result = await api.invoice
    .activity({ type, from, to, search, page: requestedPage })
    .catch(rethrowTrpcForErrorBoundary);

  // Put the URL back in step with the page the router clamped to.
  const canonicalHref = canonicalPageHref(BASE_PATH, params, result.page);
  if (canonicalHref) redirect(canonicalHref);

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Invoices", href: "/admin/invoices" },
          { label: "Activity" },
        ]}
      />
      <div className="admin-container">
        {flags.isEnabled("invoices") && <InvoicesTabs />}

        <div className="admin-header">
          <div>
            <h1>Activity</h1>
            <p>
              Everything that&apos;s happened to your invoices — sent, viewed,
              paid, reminded — in one log.
            </p>
          </div>
        </div>

        <InvoiceActivityClient
          rows={result.rows}
          totalCount={result.totalCount}
          page={result.page}
          totalPages={result.pageCount}
          pageSize={result.pageSize}
          timeZone={result.timeZone}
          filters={{ type, from, to, search }}
        />
      </div>
    </>
  );
}

export const metadata = {
  title: "Invoice Activity",
};
