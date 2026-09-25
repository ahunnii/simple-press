import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, Boxes, History } from "lucide-react";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { formatDate } from "~/lib/format-date";
import { reasonLabel } from "~/lib/inventory/reasons";
import { formatPrice } from "~/lib/prices";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { formatDate as formatCalendarDate } from "~/lib/utils";
import { api } from "~/trpc/server";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
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

import { InventoryTabs } from "../_components/inventory-tabs";
import {
  availableNow,
  isUnavailable,
  totalOwned,
  unavailableMessage,
} from "../_lib/stock-state";
import { AdminEmpty } from "../../_components/admin-empty";
import { AdminPagination } from "../../_components/admin-pagination";
import {
  DANGER_TEXT,
  SUCCESS_TEXT,
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
} from "../../_components/admin-table-style";
import { TrailHeader } from "../../_components/trail-header";
import { canonicalPageHref, parsePageParam } from "../../_lib/table-query";
import { ItemDetailActions } from "./_components/item-detail-actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function InventoryItemDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const searchParamsResolved = await searchParams;
  const basePath = `/admin/inventory/${id}`;

  const { membershipRole } = await requireAdminAccess();
  const canManage = membershipRole !== "STAFF";

  const requestedPage = parsePageParam(searchParamsResolved.page) ?? 1;

  const [pool, history, flags] = await Promise.all([
    api.baseInventoryUnit.getById({ id }).catch(rethrowTrpcForErrorBoundary),
    api.baseInventoryUnit
      .history({ itemId: id, page: requestedPage })
      .catch(rethrowTrpcForErrorBoundary),
    getBusinessFlags(),
  ]);

  if (!pool) {
    notFound();
  }

  const rentalsEnabled = flags.isEnabled("inventoryRentals");

  // Put the URL back in step with the page the router clamped to — see
  // `canonicalPageHref`. Before the render, because `redirect` throws.
  const canonicalHref = canonicalPageHref(
    basePath,
    searchParamsResolved,
    history.page,
  );
  if (canonicalHref) redirect(canonicalHref);

  const { sales } = pool;
  const unavailable = isUnavailable(pool);
  const isRental = pool.itemType === "rental";
  const available = availableNow(pool);

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Inventory", href: "/admin/inventory" },
          { label: pool.name },
        ]}
      />

      <div className="admin-container">
        <InventoryTabs rentalsEnabled={rentalsEnabled} />

        <div className="admin-header gap-4">
          <div>
            <h1>{pool.name}</h1>
            {pool.description && <p>{pool.description}</p>}
          </div>
          <ItemDetailActions
            item={pool}
            canManage={canManage}
            rentalsEnabled={rentalsEnabled}
          />
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isRental ? (
            <>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Total</p>
                <p className="mt-1 text-2xl font-semibold">
                  {totalOwned(pool)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Out</p>
                <p className="mt-1 text-2xl font-semibold">{pool.outQty}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Available</p>
                <p className="mt-1 text-2xl font-semibold">{available}</p>
              </div>
              {pool.reservedQty > 0 && (
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">Reserved</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {pool.reservedQty}
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">On hand</p>
                <p className="mt-1 text-2xl font-semibold">
                  {pool.inventoryQty}
                </p>
              </div>
              {pool.reservedQty > 0 && (
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">Reserved</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {pool.reservedQty}
                  </p>
                </div>
              )}
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">
                  Units sold (net)
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {sales.netSoldUnits}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">Returned</p>
                <p className="mt-1 text-2xl font-semibold">
                  {sales.returnedUnits}
                </p>
              </div>
            </>
          )}
        </div>

        {unavailable && (
          // Same amber treatment the platform already uses for a
          // "needs attention, not broken" banner (see the INFORM Act
          // threshold alert on /admin/finances) — `destructive` would claim
          // the shelf is empty, which the Out of stock styling already covers.
          <Alert variant="warning" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Nothing available to sell</AlertTitle>
            <AlertDescription>{unavailableMessage(pool)}</AlertDescription>
          </Alert>
        )}

        {sales.oversellEvents > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Some sales could not be deducted</AlertTitle>
            <AlertDescription>
              {sales.oversellEvents} sale
              {sales.oversellEvents === 1 ? "" : "s"} could not be deducted from
              this item because stock was insufficient. Units sold may be
              understated.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <div>
            <h2 className="mb-4 text-lg font-semibold">Details</h2>
            <Card className="p-4">
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground text-sm">Type</dt>
                  <dd className="mt-0.5">
                    <Badge variant={isRental ? "secondary" : "outline"}>
                      {isRental ? "Rental" : "Stock"}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm">SKU</dt>
                  <dd className="text-foreground mt-0.5">
                    {pool.sku ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm">Category</dt>
                  <dd className="text-foreground mt-0.5">
                    {pool.category ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm">
                    Storage location
                  </dt>
                  <dd className="text-foreground mt-0.5">
                    {pool.storageLocation ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
                {canManage && (
                  <div>
                    <dt className="text-muted-foreground text-sm">
                      Unit cost / replacement value
                    </dt>
                    <dd className="text-foreground mt-0.5">
                      {pool.unitCostCents != null ? (
                        formatPrice(pool.unitCostCents)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground text-sm">
                    Low stock alert at
                  </dt>
                  <dd className="text-foreground mt-0.5">
                    {pool.lowInventoryThreshold ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
              </dl>
            </Card>
          </div>

          {isRental && pool.openLines.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold">Currently out</h2>
              <Card className={TABLE_CARD}>
                <Table>
                  <TableCaption className="sr-only">
                    Open check-outs for {pool.name}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className={TABLE_HEAD}>
                        Check-out
                      </TableHead>
                      <TableHead scope="col" className={TABLE_HEAD}>
                        Customer
                      </TableHead>
                      <TableHead scope="col" className={TABLE_HEAD}>
                        Out since
                      </TableHead>
                      <TableHead scope="col" className={TABLE_HEAD}>
                        Due
                      </TableHead>
                      <TableHead scope="col" className={TABLE_HEAD}>
                        Outstanding
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pool.openLines.map((line) => (
                      <TableRow key={line.lineId}>
                        <TableCell
                          className={`${TABLE_CELL} whitespace-normal`}
                        >
                          <Link
                            href={`/admin/inventory/checkouts/${line.checkoutId}`}
                            className="text-foreground font-medium hover:underline"
                          >
                            {line.label}
                          </Link>
                        </TableCell>
                        <TableCell className={`text-foreground ${TABLE_CELL}`}>
                          {line.customerName ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className={`text-foreground ${TABLE_CELL}`}>
                          {formatCalendarDate(line.checkedOutAt)}
                        </TableCell>
                        <TableCell className={TABLE_CELL}>
                          {line.dueBackOn ? (
                            <div className="flex items-center gap-2">
                              <span
                                className={
                                  line.overdue
                                    ? `font-medium ${DANGER_TEXT}`
                                    : "text-foreground"
                                }
                              >
                                {formatCalendarDate(line.dueBackOn)}
                              </span>
                              {line.overdue && (
                                <Badge variant="destructive">Overdue</Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-foreground tabular-nums ${TABLE_CELL}`}
                        >
                          {line.outstanding}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Boxes className="h-4 w-4" />
              Linked products
            </h2>
            {pool.products.length === 0 ? (
              <AdminEmpty
                icon={Boxes}
                title="No products use this item yet"
                description="Link a product to this item to sell from its stock."
              />
            ) : (
              <Card className={TABLE_CARD}>
                <Table>
                  <TableCaption className="sr-only">
                    Products drawing from the {pool.name} item
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className={TABLE_HEAD}>
                        Product
                      </TableHead>
                      <TableHead scope="col" className={TABLE_HEAD}>
                        Units per purchase
                      </TableHead>
                      <TableHead scope="col" className={TABLE_HEAD}>
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pool.products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell
                          className={`${TABLE_CELL} whitespace-normal`}
                        >
                          {canManage ? (
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="text-foreground font-medium hover:underline"
                            >
                              {product.name}
                            </Link>
                          ) : (
                            <span className="text-foreground font-medium">
                              {product.name}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={`text-foreground ${TABLE_CELL}`}>
                          {product.baseUnitsConsumed ?? 1}
                        </TableCell>
                        <TableCell className={TABLE_CELL}>
                          <Badge
                            variant={
                              product.published ? "default" : "secondary"
                            }
                          >
                            {product.published ? "Published" : "Draft"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>

          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <History className="h-4 w-4" />
              Movement history
            </h2>
            {history.rows.length === 0 ? (
              <AdminEmpty
                icon={History}
                title="No movement yet"
                description="Sales, returns, and manual adjustments to this item will show up here."
              />
            ) : (
              <>
                <Card className={TABLE_CARD}>
                  <Table>
                    <TableCaption className="sr-only">
                      Movement history for the {pool.name} item
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col" className={TABLE_HEAD}>
                          Date
                        </TableHead>
                        <TableHead scope="col" className={TABLE_HEAD}>
                          Reason
                        </TableHead>
                        <TableHead scope="col" className={TABLE_HEAD}>
                          Change
                        </TableHead>
                        <TableHead scope="col" className={TABLE_HEAD}>
                          Resulting qty
                        </TableHead>
                        <TableHead scope="col" className={TABLE_HEAD}>
                          Reference
                        </TableHead>
                        <TableHead scope="col" className={TABLE_HEAD}>
                          By
                        </TableHead>
                        <TableHead
                          scope="col"
                          className={`min-w-[14rem] ${TABLE_HEAD}`}
                        >
                          Note
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.rows.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell
                            className={`text-foreground ${TABLE_CELL}`}
                          >
                            {formatDate(entry.createdAt)}
                          </TableCell>
                          <TableCell className={TABLE_CELL}>
                            <Badge variant="outline">
                              {reasonLabel(entry.reason)}
                            </Badge>
                          </TableCell>
                          <TableCell className={TABLE_CELL}>
                            <span
                              className={
                                entry.changeQty > 0
                                  ? `font-medium ${SUCCESS_TEXT}`
                                  : entry.changeQty < 0
                                    ? `font-medium ${DANGER_TEXT}`
                                    : "text-foreground"
                              }
                            >
                              {entry.changeQty > 0
                                ? `+${entry.changeQty}`
                                : entry.changeQty < 0
                                  ? `−${Math.abs(entry.changeQty)}`
                                  : entry.changeQty}
                            </span>
                          </TableCell>
                          <TableCell
                            className={`text-foreground ${TABLE_CELL}`}
                          >
                            {entry.newQty}
                          </TableCell>
                          <TableCell className={TABLE_CELL}>
                            {entry.order ? (
                              <Link
                                href={`/admin/orders/${entry.order.id}`}
                                className="text-foreground hover:underline"
                              >
                                Order #{entry.order.orderNumber}
                              </Link>
                            ) : entry.checkout ? (
                              <Link
                                href={`/admin/inventory/checkouts/${entry.checkout.id}`}
                                className="text-foreground hover:underline"
                              >
                                {entry.checkout.label}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-foreground whitespace-normal ${TABLE_CELL}`}
                          >
                            {entry.user
                              ? (entry.user.name ?? entry.user.email)
                              : entry.order
                                ? `Order #${entry.order.orderNumber}`
                                : "System"}
                          </TableCell>
                          <TableCell
                            className={`text-muted-foreground min-w-[14rem] whitespace-normal ${TABLE_CELL}`}
                          >
                            {entry.note ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>

                <AdminPagination
                  page={history.page}
                  totalPages={history.pageCount}
                  totalCount={history.totalCount}
                  pageSize={history.pageSize}
                  basePath={basePath}
                  itemNoun={{ one: "entry", many: "entries" }}
                />
              </>
            )}
          </div>
        </div>

        <p className="text-muted-foreground mt-6 text-xs">
          Units sold counts units deducted by paid orders. Refunds and
          cancellations reduce it only when stock was restocked. Consecutive
          rows may not chain under concurrent activity — each row&apos;s own
          previous/resulting quantities are always exact.
        </p>
      </div>
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const pool = await api.baseInventoryUnit.getById({ id }).catch(() => null);
  if (!pool) return { title: "Inventory item" };
  return { title: pool.name };
}
