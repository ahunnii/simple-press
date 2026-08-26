"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Info, RefreshCw, Repeat, Search } from "lucide-react";
import { toast } from "sonner";

import type { AdminFilterDef } from "../../_components/admin-filters";
import type { RouterOutputs } from "~/trpc/react";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { perDeliveryCentsFor } from "~/lib/subscriptions/mrr";
import {
  SUBSCRIPTION_STATUS_FILTER_VALUES,
  SUBSCRIPTION_STATUS_LABELS,
} from "~/lib/validators/subscription";
import { api } from "~/trpc/react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { intervalLabel } from "../_lib/interval-label";
import { AdminEmpty } from "../../_components/admin-empty";
import { AdminFilters } from "../../_components/admin-filters";
import { AdminPagination } from "../../_components/admin-pagination";
import {
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
} from "../../_components/admin-table-style";
import {
  dismissLoadingToast,
  loadingToast,
} from "../../_lib/admin-mutation-toast";
import { SubscriptionStatusBadge } from "./subscription-status-badge";

const BASE_PATH = "/admin/subscriptions";
const ITEM_NOUN = { one: "subscription", many: "subscriptions" } as const;

// Table type/density live in ../../_components/admin-table-style, matching
// the Orders/Customers/Products convention. Aliased to the short names this
// file reads with.
const TH = TABLE_HEAD;
const TD = TABLE_CELL;

const FEATURE_DISABLED_HELP =
  "Product subscriptions are turned off. Turn it back on in Settings → Features to sync.";

const STATUS_FILTER: AdminFilterDef = {
  key: "status",
  label: "Status",
  defaultValue: "all",
  options: SUBSCRIPTION_STATUS_FILTER_VALUES.map((value) => ({
    value,
    label: value === "all" ? "Any status" : SUBSCRIPTION_STATUS_LABELS[value],
  })),
};

type SubscriptionRow = RouterOutputs["subscription"]["list"][number];

export type SubscriptionsSummary = {
  active: number;
  paused: number;
  pastDue: number;
  monthlyRecurringCents: number;
};

type Props = {
  /** The current page slice only — filtering/sorting/paging happen server-side in page.tsx. */
  rows: SubscriptionRow[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  /** Unfiltered count — distinguishes "no subscriptions yet" from "no matches". */
  totalSubscriptions: number;
  featureEnabled: boolean;
  summary: SubscriptionsSummary;
};

/** The single status-specific date column: what it means shifts with `status`. */
function nextDateInfo(row: SubscriptionRow): { label: string; value: string } {
  switch (row.status) {
    case "active":
      return {
        label: "Next billing",
        value: row.nextBillingAt ? formatDate(row.nextBillingAt) : "—",
      };
    case "past_due":
      return {
        label: "Payment failed",
        value: row.lastPaymentFailedAt
          ? formatDate(row.lastPaymentFailedAt)
          : "—",
      };
    case "paused":
      return {
        label: "Resumes",
        value: row.pauseResumesAt
          ? formatDate(row.pauseResumesAt)
          : "Indefinitely",
      };
    case "cancelled":
      // "Cancelled on", not bare "Cancelled" — the Status column already
      // renders that exact word as the row's status badge, and a second,
      // identical text node in the same row reads as a rendering bug (and
      // breaks any test/AT query that expects the word to appear once).
      return {
        label: "Cancelled on",
        value: row.cancelledAt ? formatDate(row.cancelledAt) : "—",
      };
    default:
      return { label: "Started", value: formatDate(row.createdAt) };
  }
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function SubscriptionsTable({
  rows,
  totalCount,
  totalPages,
  page,
  pageSize,
  totalSubscriptions,
  featureEnabled,
  summary,
}: Props) {
  const router = useRouter();
  const utils = api.useUtils();

  const syncMutation = api.subscription.syncNow.useMutation({
    onMutate: loadingToast("Syncing…"),
    onSuccess: (data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success(
        `Synced ${data.updated} ${data.updated === 1 ? ITEM_NOUN.one : ITEM_NOUN.many}`,
      );
      void utils.subscription.invalidate();
      router.refresh();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message || "Failed to sync subscriptions");
    },
  });

  const hasResults = rows.length > 0;
  const isFiltered = totalSubscriptions > 0 && !hasResults;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Subscriptions</h1>
          <p>Recurring product subscriptions and their billing status</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={!featureEnabled || syncMutation.isPending}
            title={!featureEnabled ? FEATURE_DISABLED_HELP : undefined}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync now
          </Button>
        </div>
      </div>

      {!featureEnabled && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Product subscriptions are turned off</AlertTitle>
          <AlertDescription>
            Existing subscriptions keep billing and renewals still create orders
            — turn it on in Settings → Features to offer new ones.
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" asChild size="xs">
              <Link href="/admin/settings/features">Settings → Features</Link>
            </Button>
          </AlertAction>
        </Alert>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Active" value={String(summary.active)} />
        <StatTile label="Paused" value={String(summary.paused)} />
        <StatTile label="Past due" value={String(summary.pastDue)} />
        <StatTile
          label="Est. monthly recurring"
          value={formatPrice(summary.monthlyRecurringCents)}
        />
      </div>

      <AdminFilters
        basePath={BASE_PATH}
        searchPlaceholder="Search by customer or product…"
        searchAriaLabel="Search subscriptions by customer name, email, or product"
        filters={[STATUS_FILTER]}
        resultCount={totalCount}
        itemNoun={ITEM_NOUN}
      />

      {!hasResults ? (
        <AdminEmpty
          icon={isFiltered ? Search : Repeat}
          title={
            isFiltered
              ? "No subscriptions match your filters"
              : "No subscriptions yet"
          }
          description={
            isFiltered
              ? undefined
              : "Subscriptions appear here once a customer subscribes to a product on your storefront."
          }
          // AdminEmpty renders its own "Try adjusting your search or
          // filters." line when `filtered` — don't say it twice.
          filtered={isFiltered}
          action={
            isFiltered ? (
              <Button variant="outline" asChild>
                <Link href={BASE_PATH}>Clear filters</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Card className={TABLE_CARD}>
            <Table>
              <TableCaption className="sr-only">Subscriptions</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className={TH}>
                    Customer
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TH}`}
                  >
                    Product
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TH}`}
                  >
                    Cadence
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TH} text-right`}
                  >
                    Qty
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TH} text-right`}
                  >
                    Per delivery
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden lg:table-cell ${TH}`}
                  >
                    Date
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TH}`}
                  >
                    Status
                  </TableHead>
                  <TableHead scope="col" className={`${TH} text-right`}>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const cadence = intervalLabel(row);
                  const perDelivery = perDeliveryCentsFor(row);
                  const date = nextDateInfo(row);

                  return (
                    <TableRow key={row.id}>
                      <TableCell className={`${TD} whitespace-normal`}>
                        <div className="min-w-0">
                          <Link
                            href={`${BASE_PATH}/${row.id}`}
                            className="font-medium hover:underline"
                          >
                            {row.customerEmail}
                          </Link>
                          {row.customerName && (
                            <p className="text-muted-foreground text-sm">
                              {row.customerName}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className={`hidden md:table-cell ${TD}`}>
                        <div className="min-w-0">
                          <p className="text-foreground text-sm font-medium">
                            {row.productName}
                          </p>
                          {row.variantName && (
                            <p className="text-muted-foreground line-clamp-1 text-sm">
                              {row.variantName}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell
                        className={`hidden md:table-cell ${TD} text-foreground`}
                      >
                        {cadence}
                      </TableCell>

                      <TableCell
                        className={`hidden md:table-cell ${TD} text-foreground text-right tabular-nums`}
                      >
                        {row.quantity}
                      </TableCell>

                      <TableCell
                        className={`hidden md:table-cell ${TD} text-foreground text-right font-medium tabular-nums`}
                      >
                        {formatPrice(perDelivery)}
                      </TableCell>

                      <TableCell className={`hidden lg:table-cell ${TD}`}>
                        <div className="min-w-0">
                          <p className="text-foreground text-sm">
                            {date.value}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {date.label}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className={`hidden md:table-cell ${TD}`}>
                        <SubscriptionStatusBadge status={row.status} />
                      </TableCell>

                      <TableCell className={`${TD} text-right`}>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`${BASE_PATH}/${row.id}`}>
                            <Eye aria-hidden="true" className="mr-2 h-4 w-4" />
                            View
                            <span className="sr-only">
                              {" "}
                              subscription for {row.customerEmail}
                            </span>
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            basePath={BASE_PATH}
            itemNoun={ITEM_NOUN}
          />
        </>
      )}
    </div>
  );
}
