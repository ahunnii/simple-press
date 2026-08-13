import { redirect } from "next/navigation";

import type { FilterDefFor } from "../_components/admin-filters";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import {
  PRODUCT_SORT_DEFAULT,
  PRODUCT_SORT_VALUES,
  PRODUCT_STATUS_DEFAULT,
  PRODUCT_STATUS_VALUES,
} from "~/lib/validators/product";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import {
  canonicalPageHref,
  parsePageParam,
  pickParam,
} from "../_lib/table-query";
import { ProductsClient } from "./_components/products-client-data-table";

type Props = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
};

const BASE_PATH = "/admin/products";

// The filter definitions live here, next to the `pickParam` calls that whitelist
// the same tuples, and reach the table as a prop — the shape Customers uses.
// `FilterDefFor` pins each option list to the tuple `productListFiltersSchema`
// validates with, so a UI option the router would reject (a blanked page) and a
// value with no option (a filter only reachable by URL) are both type errors.
const STATUS_FILTER: FilterDefFor<typeof PRODUCT_STATUS_VALUES> = {
  key: "status",
  label: "Status",
  defaultValue: PRODUCT_STATUS_DEFAULT,
  options: [
    { value: "all", label: "All products" },
    { value: "published", label: "Published" },
    { value: "draft", label: "Drafts" },
  ],
};

const SORT_FILTER: FilterDefFor<typeof PRODUCT_SORT_VALUES> = {
  key: "sort",
  label: "Sort",
  defaultValue: PRODUCT_SORT_DEFAULT,
  options: [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "name-asc", label: "Name A–Z" },
    { value: "name-desc", label: "Name Z–A" },
    { value: "price-asc", label: "Price low–high" },
    { value: "price-desc", label: "Price high–low" },
  ],
};

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  // Same guard `/admin/layout.tsx` already ran, called again for its resolved
  // `membershipRole` — which is what decides whether the bulk bar may offer
  // Delete at all. Matches /admin/settings/team's use of it.
  const { session, membershipRole } = await requireAdminAccess();

  // Unlike Collections, Services and Inventory, this page does NOT narrow with
  // `buildTablePage`: `product.secureList` already filters, sorts, counts and
  // paginates in Postgres (catalogs run to thousands of rows, so fetching them
  // all to slice in memory is not on the table). The DB is the source of truth
  // for `page`/`totalPages`/`totalCount`; everything here just whitelists the
  // params going in. `pickParam` is still the right tool for that half — it's
  // what replaced the `VALID_X.includes(x as ValidX) ? x : undefined` double
  // cast this file used to carry.
  const search = params.search?.trim() ?? "";
  const status = pickParam(
    params.status,
    PRODUCT_STATUS_VALUES,
    PRODUCT_STATUS_DEFAULT,
  );
  const sort = pickParam(params.sort, PRODUCT_SORT_VALUES, PRODUCT_SORT_DEFAULT);
  const requestedPage = parsePageParam(params.page);

  const listInput = {
    search: search || undefined,
    status,
    sort,
  };

  // `secureList` clamps an out-of-range page itself and always returns a `page`
  // within range, matching `buildTablePage`'s guarantee for the in-memory path.
  const result = await api.product
    .secureList({ ...listInput, page: requestedPage })
    .catch(rethrowTrpcForErrorBoundary);

  // Put the URL back in step with what was rendered when the router clamped the
  // page — see `canonicalPageHref`. Before the render (and before the extra
  // count query below), because `redirect` throws.
  const canonicalHref = canonicalPageHref(BASE_PATH, params, result.page);
  if (canonicalHref) redirect(canonicalHref);

  // Does the catalog contain anything AT ALL, ignoring the filters? This is the
  // only thing that separates "no products yet" (offer Add Your First Product)
  // from "no matches" (offer Clear filters), and `totalCount` cannot answer it:
  // a search term matching nothing reports zero, which would tell a store with
  // 400 products it has none.
  //
  // `sort` and `page` are deliberately not part of `filtersNarrow` — neither
  // changes WHICH products match, so neither can turn a stocked catalog into an
  // empty result. Both short-circuits mean the extra query only runs on the
  // narrow "filtered down to nothing" path, never on an ordinary page load.
  const filtersNarrow = search !== "" || status !== "all";
  const hasProducts =
    result.totalCount > 0 ||
    (filtersNarrow &&
      (await api.product.hasAny().catch(rethrowTrpcForErrorBoundary))
        .hasAny);

  const isPlatformAdmin = session.user.platformRole === "PLATFORM_ADMIN";

  // Mirrors `/admin/products/export/page.tsx`'s own gate exactly, so the
  // Export button only ever appears for someone who won't land on that
  // page's Owner-only alert or its feature-disabled fallback.
  const { isEnabled } = await getBusinessFlags();
  const canExportProducts =
    (isPlatformAdmin || membershipRole === "OWNER") &&
    isEnabled("wordpressExport");

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Products" }]} />
      <ProductsClient
        products={result.products}
        filters={[STATUS_FILTER, SORT_FILTER]}
        // `null` (not `[]`) when the server declined to enumerate the matching
        // ids because more than ADMIN_BULK_SELECTION_LIMIT of them match.
        // Passed through as-is so the client can tell "not offered" apart from
        // "nothing matched" — `useAdminTableSelection` handles both.
        matchingIds={result.matchingIds}
        hasProducts={hasProducts}
        totalCount={result.totalCount}
        totalPages={result.totalPages}
        page={result.page}
        // The router owns the page size and returns it; restating it here is
        // how the "Showing X–Y of Z" readout starts quietly lying once the two
        // drift.
        pageSize={result.pageSize}
        isPlatformAdmin={isPlatformAdmin}
        canExportProducts={canExportProducts}
        // Mirrors `ownerOnlyProcedure`, which `product.bulkDelete` uses:
        // PLATFORM_ADMIN bypasses the membership check, everyone else needs
        // OWNER. Computed here so the bulk bar can OMIT the Delete button a
        // MANAGER would otherwise press and get a FORBIDDEN toast from. The
        // procedure is still the enforcement — this only stops the UI offering
        // what it will refuse.
        canBulkDelete={isPlatformAdmin || membershipRole === "OWNER"}
      />
    </>
  );
}

export const metadata = {
  title: "Products",
};
