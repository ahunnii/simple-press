import Link from "next/link";
import { Info } from "lucide-react";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

import { TrailHeader } from "../_components/trail-header";
import {
  buildTablePage,
  matchesAllTokens,
  pickParam,
} from "../_lib/table-query";
import { InventoryImportExport } from "./_components/inventory-import-export";
import { InventoryTabs } from "./_components/inventory-tabs";
import { ItemsTable } from "./_components/items-table";
import { PoolCreateButton } from "./_components/pool-create-button";
import { isLowStock, isOutOfStock, isUnavailable } from "./_lib/stock-state";

type Props = {
  searchParams: Promise<{
    search?: string;
    stock?: string;
    availability?: string;
    type?: string;
    category?: string;
    sort?: string;
    page?: string;
  }>;
};

/** Rows per page. Matches Collections — the density the admin tables settled on. */
const PAGE_SIZE = 25;

/** Items have no `published` flag, so Collections' status filter doesn't map.
 *  What an owner scans this page for is stock state. */
const VALID_STOCK = ["all", "low", "out"] as const;
/** Separate axis from `VALID_STOCK` — see `AVAILABILITY_FILTER` in
 *  items-table.tsx for why this isn't a third stock value. */
const VALID_AVAILABILITY = ["all", "unavailable"] as const;
const VALID_TYPE = ["all", "stock", "rental"] as const;
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
  "sku-asc",
  "category-asc",
] as const;

type ValidStock = (typeof VALID_STOCK)[number];
type ValidAvailability = (typeof VALID_AVAILABILITY)[number];
type ValidType = (typeof VALID_TYPE)[number];
type ValidSort = (typeof VALID_SORT)[number];

const DEFAULT_STOCK: ValidStock = "all";
const DEFAULT_AVAILABILITY: ValidAvailability = "all";
const DEFAULT_TYPE: ValidType = "all";
/** The router's own `orderBy: [{ name: "asc" }, { id: "asc" }]`, named rather than implied. */
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
  const type = pickParam(params.type, VALID_TYPE, DEFAULT_TYPE);
  const sort = pickParam(params.sort, VALID_SORT, DEFAULT_SORT);

  const [{ items, categories, canManage }, flags] = await Promise.all([
    api.baseInventoryUnit.items().catch(rethrowTrpcForErrorBoundary),
    getBusinessFlags(),
  ]);
  const rentalsEnabled = flags.isEnabled("inventoryRentals");

  // Category is the one filter whose valid set isn't known until the items
  // come back (it's every distinct category in use), so it's whitelisted
  // here instead of against a static tuple.
  const category =
    params.category && categories.includes(params.category)
      ? params.category
      : "all";

  // `items()` intentionally stays a single unfiltered fetch — the stock
  // filter and the units-sold sort read `sales`/`outQty`, which only exist
  // once the router has merged its aggregates onto each item. Neither is
  // expressible as a Prisma `where`/`orderBy`. See `buildTablePage`'s doc for
  // the in-memory filter/sort/paginate pipeline this and Collections share.
  const matching = items.filter((item) => {
    // Description, SKU, category and storage location are all meaningful
    // ways an owner might search for an item ("throne", "CHR-GLD-01",
    // "Seating", "Warehouse B") — tokenized via `matchesAllTokens` so a
    // multi-word query can match across fields rather than needing to
    // appear whole in a single one.
    const matchesSearch = matchesAllTokens(search, [
      item.name,
      item.description,
      item.sku,
      item.category,
      item.storageLocation,
    ]);
    const matchesStock =
      stock === "all" ||
      (stock === "low" && isLowStock(item)) ||
      (stock === "out" && isOutOfStock(item));
    const matchesAvailability =
      availability === "all" ||
      (availability === "unavailable" && isUnavailable(item));
    const matchesType = type === "all" || item.itemType === type;
    const matchesCategory = category === "all" || item.category === category;
    return (
      matchesSearch &&
      matchesStock &&
      matchesAvailability &&
      matchesType &&
      matchesCategory
    );
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
        case "sku-asc":
          // No-SKU rows sort after every SKU'd row, then by name.
          if (!a.sku && !b.sku) return a.name.localeCompare(b.name);
          if (!a.sku) return 1;
          if (!b.sku) return -1;
          return a.sku.localeCompare(b.sku) || a.name.localeCompare(b.name);
        case "category-asc":
          if (!a.category && !b.category) return a.name.localeCompare(b.name);
          if (!a.category) return 1;
          if (!b.category) return -1;
          return (
            a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
          );
        case "name-asc":
        default:
          return a.name.localeCompare(b.name);
      }
    },
  });

  // When rentals is off, the Check-outs tab and Out/Total column disappear —
  // but a check-out created while the flag was on can still leave units
  // outstanding. This is the one place that state stays visible: a link back
  // to the (still-readable) checkouts list, so nothing is silently stranded.
  const outstandingWhileRentalsOff = rentalsEnabled
    ? 0
    : items.reduce((sum, item) => sum + item.outQty, 0);

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Inventory" }]} />
      <div className="admin-container">
        <InventoryTabs rentalsEnabled={rentalsEnabled} />

        {/* `gap-4`: `admin-header` itself has no gap, and this page's
            description is long enough to run right into the create button.
            `flex-col`/`sm:flex-row`: `admin-header` doesn't wrap, and three
            header buttons (Import, Export, New item) beside even a one-line
            description clip "New item" off-screen on a phone — stack title
            and buttons instead of changing the shared class. */}
        <div className="admin-header flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div>
            <h1>Inventory</h1>
            <p>
              Track standalone stock and rentals, and link products to share an
              item&apos;s stock.
            </p>
          </div>
          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <InventoryImportExport />
              {/* Collections' create action is a <Link>, so it can live in this
                  server component directly. Inventory's opens a dialog, so the
                  button and its open state ship together as one client island. */}
              <PoolCreateButton
                label="New item"
                categories={categories}
                rentalsEnabled={rentalsEnabled}
              />
            </div>
          )}
        </div>

        {outstandingWhileRentalsOff > 0 && (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>
              {outstandingWhileRentalsOff} unit
              {outstandingWhileRentalsOff === 1 ? " is" : "s are"} still checked
              out
            </AlertTitle>
            <AlertDescription>
              Rental Check-outs is off, but earlier check-outs are still open.{" "}
              <Link href="/admin/inventory/checkouts">
                Check them in from the check-outs list
              </Link>
              .
            </AlertDescription>
          </Alert>
        )}

        <ItemsTable
          items={pageItems}
          totalItems={items.length}
          totalCount={totalCount}
          totalPages={totalPages}
          page={page}
          pageSize={PAGE_SIZE}
          categories={categories}
          canManage={canManage}
          rentalsEnabled={rentalsEnabled}
        />
      </div>
    </>
  );
}

export const metadata = {
  title: "Inventory",
};
