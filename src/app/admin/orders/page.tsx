import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search, ShoppingCart } from "lucide-react";

import type { FilterDefFor } from "../_components/admin-filters";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { cn } from "~/lib/utils";
import {
  ORDER_FULFILLMENT_DEFAULT as FULFILLMENT_DEFAULT,
  ORDER_FULFILLMENT_VALUES as FULFILLMENT_VALUES,
  ORDER_PAYMENT_DEFAULT as PAYMENT_DEFAULT,
  ORDER_PAYMENT_VALUES as PAYMENT_VALUES,
  ORDER_SORT_DEFAULT as SORT_DEFAULT,
  ORDER_SORT_VALUES as SORT_VALUES,
  ORDER_STATUS_DEFAULT as STATUS_DEFAULT,
  ORDER_STATUS_VALUES as STATUS_VALUES,
} from "~/lib/validators/order";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import {
  CARD_STRETCHED_LINK,
  INTERACTIVE_CARD,
} from "../_components/admin-card-grid";
import { AdminEmpty } from "../_components/admin-empty";
import { AdminFilters } from "../_components/admin-filters";
import { AdminPagination } from "../_components/admin-pagination";
import { TrailHeader } from "../_components/trail-header";
import {
  canonicalPageHref,
  parsePageParam,
  pickParam,
} from "../_lib/table-query";
import { ExportOrdersButton } from "./_components/export-orders-button";
import { OrdersTable } from "./_components/orders-table";

type Props = {
  searchParams: Promise<{
    status?: string;
    search?: string;
    fulfillment?: string;
    paymentStatus?: string;
    sort?: string;
    page?: string;
  }>;
};

const BASE_PATH = "/admin/orders";
const ITEM_NOUN = { one: "order", many: "orders" } as const;

// Pinned to the same `as const` tuples `order.getAll` (and `export.exportOrders`)
// validate with — see the doc comment on those tuples in ~/lib/validators/order
// for what drifts if a UI option and the router's z.enum disagree.
const STATUS_FILTER: FilterDefFor<typeof STATUS_VALUES> = {
  key: "status",
  label: "Status",
  defaultValue: STATUS_DEFAULT,
  options: [
    { value: "all", label: "All Statuses" },
    { value: "open", label: "Open" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "refunded", label: "Refunded" },
  ],
};

const FULFILLMENT_FILTER: FilterDefFor<typeof FULFILLMENT_VALUES> = {
  key: "fulfillment",
  label: "Fulfillment",
  defaultValue: FULFILLMENT_DEFAULT,
  options: [
    { value: "all", label: "All Fulfillment" },
    { value: "unfulfilled", label: "Unfulfilled" },
    { value: "partially_fulfilled", label: "Partially Fulfilled" },
    { value: "fulfilled", label: "Fulfilled" },
  ],
};

const PAYMENT_FILTER: FilterDefFor<typeof PAYMENT_VALUES> = {
  key: "paymentStatus",
  label: "Payment",
  defaultValue: PAYMENT_DEFAULT,
  options: [
    { value: "all", label: "All Payments" },
    { value: "pending", label: "Awaiting Payment" },
    { value: "paid", label: "Paid" },
    { value: "failed", label: "Failed" },
    { value: "refunded", label: "Refunded" },
  ],
};

const SORT_FILTER: FilterDefFor<typeof SORT_VALUES> = {
  key: "sort",
  label: "Sort",
  defaultValue: SORT_DEFAULT,
  options: [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "total_desc", label: "Highest total" },
    { value: "total_asc", label: "Lowest total" },
  ],
};

type QueueCard = {
  key: string;
  label: string;
  count: number;
  href: string;
  /** Exact-match against the current whitelisted params — a subset match
   *  would let more than one card read as "selected" at once. */
  active: boolean;
};

/** One queue-shortcut card: label doubles as the whole-card link via
 *  CARD_STRETCHED_LINK (same pattern as the galleries card grid — see
 *  admin-card-grid.tsx). `active` renders the selected-state ring and
 *  `aria-current` when the current filters exactly match this card's combo. */
function QueueStatCard({ card }: { card: QueueCard }) {
  return (
    // INTERACTIVE_CARD carries `py-0` for the galleries grid, where images run
    // edge-to-edge — a text-only stat card needs the Card's vertical padding
    // back, so `py-6` re-overrides it (tailwind-merge keeps the later class).
    <Card
      className={cn(
        INTERACTIVE_CARD,
        "py-6",
        card.active && "ring-ring ring-2",
      )}
    >
      <CardHeader>
        <CardDescription>
          <Link
            href={card.href}
            aria-current={card.active ? "true" : undefined}
            className={CARD_STRETCHED_LINK}
          >
            {card.label}
          </Link>
        </CardDescription>
        <CardTitle className="text-3xl tabular-nums">{card.count}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export default async function OrdersPage({ searchParams }: Props) {
  const params = await searchParams;

  // Whitelist everything going in. `pickParam` falls back rather than throwing,
  // so a stale bookmark or a hand-typed `?sort=bogus` renders the default view;
  // `parsePageParam` does the same for `?page=abc`.
  const search = params.search?.trim() ?? "";
  const status = pickParam(params.status, STATUS_VALUES, STATUS_DEFAULT);
  const fulfillment = pickParam(
    params.fulfillment,
    FULFILLMENT_VALUES,
    FULFILLMENT_DEFAULT,
  );
  const paymentStatus = pickParam(
    params.paymentStatus,
    PAYMENT_VALUES,
    PAYMENT_DEFAULT,
  );
  const sort = pickParam(params.sort, SORT_VALUES, SORT_DEFAULT);
  const requestedPage = parsePageParam(params.page);

  // The router filters, sorts, counts and paginates in Postgres, and clamps an
  // out-of-range page itself — so `page`, `totalPages` and `pageSize` below are
  // all taken from the result rather than recomputed here.
  const result = await api.order
    .getAll({
      search: search || undefined,
      status,
      fulfillment,
      paymentStatus,
      sort,
      page: requestedPage,
    })
    .catch(rethrowTrpcForErrorBoundary);

  // Put the URL back in step with what was rendered when the router clamped the
  // page — see `canonicalPageHref`. Before the render, because `redirect` throws.
  const canonicalHref = canonicalPageHref(BASE_PATH, params, result.page);
  if (canonicalHref) redirect(canonicalHref);

  // `sort` and `page` are deliberately excluded: neither changes WHICH orders
  // match, so neither can turn a business with orders into an empty result.
  const filtersNarrow =
    search !== "" ||
    status !== "all" ||
    fulfillment !== "all" ||
    paymentStatus !== "all";

  // Does the business have ANY orders at all, ignoring filters? That's the only
  // thing separating "no orders yet" from "no matches for the current filters" —
  // `totalCount` can't answer it, since a search matching nothing reports zero
  // for a store with hundreds of orders too. Short-circuited so `hasAny` only
  // runs on the narrow "filtered to nothing" path.
  const hasOrders =
    result.totalCount > 0 ||
    (filtersNarrow &&
      (await api.order.hasAny().catch(rethrowTrpcForErrorBoundary)).hasAny);

  const { stats } = result;

  // Business-wide queue shortcuts. Each `active` check is an EXACT match on
  // the whitelisted params (not a subset) so at most one card is ever
  // selected — e.g. "Open orders" itself must NOT read as active while
  // "Needs fulfillment" (also status=open) is selected.
  const queueCards: QueueCard[] = [
    {
      key: "open",
      label: "Open orders",
      count: stats.openCount,
      href: `${BASE_PATH}?status=open`,
      active:
        status === "open" &&
        fulfillment === "all" &&
        paymentStatus === "all" &&
        search === "",
    },
    {
      key: "needs-fulfillment",
      label: "Needs fulfillment",
      count: stats.needsFulfillmentCount,
      href: `${BASE_PATH}?status=open&fulfillment=unfulfilled`,
      active:
        status === "open" &&
        fulfillment === "unfulfilled" &&
        paymentStatus === "all" &&
        search === "",
    },
    {
      key: "awaiting-payment",
      label: "Awaiting payment",
      count: stats.awaitingPaymentCount,
      href: `${BASE_PATH}?status=open&paymentStatus=pending`,
      active:
        status === "open" &&
        fulfillment === "all" &&
        paymentStatus === "pending" &&
        search === "",
    },
  ];

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Orders" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Orders</h1>
            <p>Manage your customer orders</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportOrdersButton />
            <Button asChild>
              <Link href="/admin/orders/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Manual Order
              </Link>
            </Button>
          </div>
        </div>

        {!hasOrders ? (
          <AdminEmpty
            icon={ShoppingCart}
            title="No orders yet"
            description="Orders appear here when customers check out on your storefront. You can also create one manually for phone or in-person sales."
            action={
              <Button asChild>
                <Link href="/admin/orders/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Manual Order
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            {/* Business-wide queue totals, unaffected by the current filters —
                every count here is scoped only to `businessId`, never to
                `where`, so each card's number is exactly what the table will
                show once you click it. They double as filter shortcuts, so
                they stay visible under any filter (unlike the old all-time
                vanity stats they replaced, which were hidden once filtered
                because they had no filter-navigation purpose). */}
            <div className="mb-8 grid gap-6 md:grid-cols-3">
              {queueCards.map((card) => (
                <QueueStatCard key={card.key} card={card} />
              ))}
            </div>

            <AdminFilters
              basePath={BASE_PATH}
              searchPlaceholder="Search by customer, email, or order number…"
              // Names the fields actually matched — `buildOrderListWhere` ORs
              // over customerEmail, customerName and the order number.
              searchAriaLabel="Search orders by customer name, email, or order number"
              filters={[
                STATUS_FILTER,
                FULFILLMENT_FILTER,
                PAYMENT_FILTER,
                SORT_FILTER,
              ]}
              resultCount={result.totalCount}
              itemNoun={ITEM_NOUN}
            />

            {result.orders.length === 0 ? (
              <AdminEmpty
                icon={Search}
                title="No orders match your filters"
                // AdminEmpty renders its own "Try adjusting your search or
                // filters." line when `filtered` — don't say it twice.
                filtered
                action={
                  <Button variant="outline" asChild>
                    <Link href={BASE_PATH}>Clear filters</Link>
                  </Button>
                }
              />
            ) : (
              <>
                <OrdersTable orders={result.orders} />
                <AdminPagination
                  page={result.page}
                  totalPages={result.totalPages}
                  totalCount={result.totalCount}
                  // The router owns the page size and returns it; restating it
                  // as a local literal is how the "Showing X–Y of Z" readout
                  // starts quietly lying once the two drift.
                  pageSize={result.pageSize}
                  basePath={BASE_PATH}
                  itemNoun={ITEM_NOUN}
                />
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

export const metadata = {
  title: "Orders",
};
