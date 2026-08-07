import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { buildTablePage, matchesAllTokens, pickParam } from "../_lib/table-query";
import { PoolCreateButton } from "./_components/pool-create-button";
import { PoolsTable } from "./_components/pools-table";
import { isLowStock, isOutOfStock, isUnavailable } from "./_lib/stock-state";

type Props = {
  searchParams: Promise<{
    search?: string;
    stock?: string;
    availability?: string;
    sort?: string;
    page?: string;
  }>;
};

/** Rows per page. Matches Collections — the density the admin tables settled on. */
const PAGE_SIZE = 25;

/** Pools have no `published` flag, so Collections' status filter doesn't map.
 *  What an owner scans this page for is stock state. */
const VALID_STOCK = ["all", "low", "out"] as const;
/** Separate axis from `VALID_STOCK` — see `AVAILABILITY_FILTER` in
 *  pools-table.tsx for why this isn't a third stock value. */
const VALID_AVAILABILITY = ["all", "unavailable"] as const;
const VALID_SORT = [
  "name-asc",
  "name-desc",
  "newest",
  "oldest",
  "qty-asc",
  "qty-desc",
  "sold-desc",
  "sold-asc",
  "products-desc",
  "products-asc",
] as const;

type ValidStock = (typeof VALID_STOCK)[number];
type ValidAvailability = (typeof VALID_AVAILABILITY)[number];
type ValidSort = (typeof VALID_SORT)[number];

const DEFAULT_STOCK: ValidStock = "all";
const DEFAULT_AVAILABILITY: ValidAvailability = "all";
/** The router's own `orderBy: { name: "asc" }`, named rather than implied. */
const DEFAULT_SORT: ValidSort = "name-asc";

export default async function InventoryPage({ searchParams }: Props) {
  const params = await searchParams;

  const search = params.search?.trim() ?? "";
  const stock = pickParam(params.stock, VALID_STOCK, DEFAULT_STOCK);
  const availability = pickParam(
    params.availability,
    VALID_AVAILABILITY,
    DEFAULT_AVAILABILITY,
  );
  const sort = pickParam(params.sort, VALID_SORT, DEFAULT_SORT);

  const pools = await api.baseInventoryUnit
    .list()
    .catch(rethrowTrpcForErrorBoundary);

  // `list` intentionally stays input-free — /admin/products/new and
  // /admin/products/[id] both call it for the base-unit picker and want every
  // pool — so the narrowing happens here instead.
  //
  // It also has to happen here: the stock filter and the units-sold sort read
  // `sales`, which only exists once the router has merged its `inventoryHistory`
  // groupBy onto each pool. Neither is expressible as a Prisma `where`/`orderBy`.
  const matching = pools.filter((pool) => {
    // Description is meaningful on a pool ("6 rolls per case"), so search covers
    // it as well as the name. Tokenized via `matchesAllTokens` so a multi-word
    // query can match across the two fields rather than needing to appear
    // whole in a single one.
    const matchesSearch = matchesAllTokens(search, [
      pool.name,
      pool.description,
    ]);
    const matchesStock =
      stock === "all" ||
      (stock === "low" && isLowStock(pool)) ||
      (stock === "out" && isOutOfStock(pool));
    const matchesAvailability =
      availability === "all" ||
      (availability === "unavailable" && isUnavailable(pool));
    return matchesSearch && matchesStock && matchesAvailability;
  });

  // Primary ordering only: non-name sorts fall back to name A–Z here, and
  // `buildTablePage` appends the `id` tie-break on top. `name` is not unique on
  // BaseInventoryUnit, so the name fallback alone can still return 0 — see the
  // helper's doc for what that costs under pagination.
  const { pageItems, totalCount, totalPages, page } = buildTablePage(matching, {
    pageParam: params.page,
    pageSize: PAGE_SIZE,
    comparePrimary: (a, b) => {
      switch (sort) {
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "newest":
          return b.createdAt.getTime() - a.createdAt.getTime();
        case "oldest":
          return a.createdAt.getTime() - b.createdAt.getTime();
        case "qty-asc":
          return (
            a.inventoryQty - b.inventoryQty || a.name.localeCompare(b.name)
          );
        case "qty-desc":
          return (
            b.inventoryQty - a.inventoryQty || a.name.localeCompare(b.name)
          );
        case "sold-desc":
          return (
            b.sales.netSoldUnits - a.sales.netSoldUnits ||
            a.name.localeCompare(b.name)
          );
        case "sold-asc":
          return (
            a.sales.netSoldUnits - b.sales.netSoldUnits ||
            a.name.localeCompare(b.name)
          );
        case "products-desc":
          return (
            b._count.products - a._count.products ||
            a.name.localeCompare(b.name)
          );
        case "products-asc":
          return (
            a._count.products - b._count.products ||
            a.name.localeCompare(b.name)
          );
        case "name-asc":
        default:
          return a.name.localeCompare(b.name);
      }
    },
  });

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Inventory" }]} />
      <div className="admin-container">
        {/* `gap-4`: `admin-header` itself has no gap, and this page's
            description is long enough to run right into the create button. */}
        <div className="admin-header gap-4">
          <div>
            <h1>Inventory</h1>
            <p>
              Manage shared inventory pools. Products can draw from a base unit
              — for example, a &ldquo;4-pack Roll&rdquo; pool powers your
              24-pack (6 rolls) and 48-pack (12 rolls) listings.
            </p>
          </div>
          {/* Collections' create action is a <Link>, so it can live in this
              server component directly. Inventory's opens a dialog, so the
              button and its open state ship together as one client island. */}
          <PoolCreateButton label="New Base Unit" />
        </div>

        <PoolsTable
          pools={pageItems}
          totalPools={pools.length}
          totalCount={totalCount}
          totalPages={totalPages}
          page={page}
          pageSize={PAGE_SIZE}
        />
      </div>
    </>
  );
}

export const metadata = {
  title: "Inventory",
};
