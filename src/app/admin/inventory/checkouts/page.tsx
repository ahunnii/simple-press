import { redirect } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { CHECKOUT_LIST_STATUSES } from "~/server/api/routers/inventory-checkout";
import { api } from "~/trpc/server";

import { TrailHeader } from "../../_components/trail-header";
import {
  canonicalPageHref,
  parsePageParam,
  pickParam,
} from "../../_lib/table-query";
import { CheckoutsClient } from "./_components/checkouts-client";

type Props = {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
  }>;
};

const BASE_PATH = "/admin/inventory/checkouts";
/** Mirrors the router's own `SEARCH_MAX` — keeps a pasted essay from making
 *  the round trip instead of narrowing to nothing server-side. */
const SEARCH_MAX_LENGTH = 100;

export default async function InventoryCheckoutsPage({ searchParams }: Props) {
  const params = await searchParams;

  // The `inventory` flag gate lives on `../layout.tsx` (this route nests
  // under it); `inventoryRentals` only gates NEW activity — reads stay open
  // even when it's off, so it's checked here rather than as a page gate.
  await requireAdminAccess();
  const flags = await getBusinessFlags();
  const rentalsEnabled = flags.isEnabled("inventoryRentals");

  const status = pickParam(params.status, CHECKOUT_LIST_STATUSES, "open");
  const search = (params.search?.trim() ?? "").slice(0, SEARCH_MAX_LENGTH);
  const requestedPage = parsePageParam(params.page) ?? 1;

  const list = await api.inventoryCheckout
    .list({ status, search: search || undefined, page: requestedPage })
    .catch(rethrowTrpcForErrorBoundary);

  // Put the URL back in step with the page the router clamped to.
  const canonicalHref = canonicalPageHref(BASE_PATH, params, list.page);
  if (canonicalHref) redirect(canonicalHref);

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Inventory", href: "/admin/inventory" },
          { label: "Check-outs" },
        ]}
      />
      <CheckoutsClient
        rows={list.rows}
        totalCount={list.totalCount}
        page={list.page}
        pageCount={list.pageCount}
        pageSize={list.pageSize}
        counts={list.counts}
        status={status}
        search={search}
        timeZone={list.timeZone}
        rentalsEnabled={rentalsEnabled}
      />
    </>
  );
}

export const metadata = {
  title: "Check-outs",
};
