import { redirect } from "next/navigation";

import { isRealCalendarDate } from "~/lib/calendar-date";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { MANUAL_REASONS, ORDER_LEDGER_REASONS } from "~/lib/inventory/reasons";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { InventoryTabs } from "../_components/inventory-tabs";
import { TrailHeader } from "../../_components/trail-header";
import { canonicalPageHref, parsePageParam } from "../../_lib/table-query";
import { ActivityClient } from "./_components/activity-client";

type Props = {
  searchParams: Promise<{
    item?: string;
    reason?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

const BASE_PATH = "/admin/inventory/activity";

/**
 * Every reason the `reason` filter accepts: the manual vocabulary plus the
 * order-driven one (`sale`, `oversell`, `return` — `return` overlaps and is
 * de-duplicated). An unrecognized value falls back to "all", same as every
 * other `pickParam`-narrowed filter in the admin.
 */
const REASON_FILTER_VALUES: readonly string[] = [
  ...new Set<string>([...MANUAL_REASONS, ...ORDER_LEDGER_REASONS]),
];

function pickReason(value: string | undefined): string {
  return value !== undefined && REASON_FILTER_VALUES.includes(value)
    ? value
    : "all";
}

/** `from`/`to` are free-typed `YYYY-MM-DD` — an invalid or partial date (a
 *  half-typed URL, a stale bookmark) is dropped rather than sent to the
 *  router, which would 400 the whole page. */
function pickDate(value: string | undefined): string | undefined {
  return value && isRealCalendarDate(value) ? value : undefined;
}

export default async function InventoryActivityPage({ searchParams }: Props) {
  const params = await searchParams;
  const { membershipRole } = await requireAdminAccess();
  const canManage = membershipRole !== "STAFF";
  const flags = await getBusinessFlags();
  const rentalsEnabled = flags.isEnabled("inventoryRentals");

  const itemIdRaw = params.item?.trim();
  const itemId = itemIdRaw === "" ? undefined : itemIdRaw;
  const reason = pickReason(params.reason);
  const from = pickDate(params.from);
  const to = pickDate(params.to);
  const requestedPage = parsePageParam(params.page) ?? 1;

  const [history, itemsResult] = await Promise.all([
    api.baseInventoryUnit
      .history({
        itemId,
        reasons: reason === "all" ? undefined : [reason],
        from,
        to,
        page: requestedPage,
      })
      .catch(rethrowTrpcForErrorBoundary),
    api.baseInventoryUnit.items().catch(rethrowTrpcForErrorBoundary),
  ]);

  // Put the URL back in step with the page the router clamped to.
  const canonicalHref = canonicalPageHref(BASE_PATH, params, history.page);
  if (canonicalHref) redirect(canonicalHref);

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Inventory", href: "/admin/inventory" },
          { label: "Activity" },
        ]}
      />
      <div className="admin-container">
        <InventoryTabs rentalsEnabled={rentalsEnabled} />

        <div className="admin-header">
          <div>
            <h1>Activity</h1>
            <p>
              Every change to your inventory counts — sales, restocks,
              check-outs, and manual adjustments — in one log.
            </p>
          </div>
        </div>

        <ActivityClient
          rows={history.rows}
          totalCount={history.totalCount}
          page={history.page}
          totalPages={history.pageCount}
          pageSize={history.pageSize}
          items={itemsResult.items}
          canManage={canManage}
          filters={{ itemId, reason, from, to }}
        />
      </div>
    </>
  );
}

export const metadata = {
  title: "Inventory Activity",
};
