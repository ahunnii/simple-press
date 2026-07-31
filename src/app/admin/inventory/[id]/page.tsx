import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Boxes, History } from "lucide-react";

import { formatDate } from "~/lib/format-date";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";

import { AdminEmpty } from "../../_components/admin-empty";
import { TrailHeader } from "../../_components/trail-header";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function InventoryPoolDetailPage({ params }: Props) {
  const { id } = await params;

  const pool = await api.baseInventoryUnit
    .getById({ id })
    .catch(rethrowTrpcForErrorBoundary);

  if (!pool) {
    notFound();
  }

  const { sales } = pool;

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Inventory", href: "/admin/inventory" },
          { label: pool.name },
        ]}
      />

      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>{pool.name}</h1>
            {pool.description && <p>{pool.description}</p>}
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-muted-foreground text-sm">On hand</p>
            <p className="mt-1 text-2xl font-semibold">{pool.inventoryQty}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-muted-foreground text-sm">Units sold (net)</p>
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
          <div className="rounded-lg border p-4">
            <p className="text-muted-foreground text-sm">
              Products using this pool
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {pool._count.products}
            </p>
          </div>
        </div>

        {sales.oversellEvents > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Some sales could not be deducted</AlertTitle>
            <AlertDescription>
              {sales.oversellEvents} sale
              {sales.oversellEvents === 1 ? "" : "s"} could not be deducted
              from this pool because stock was insufficient. Units sold may be
              understated.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Boxes className="h-4 w-4" />
              Linked products
            </h2>
            {pool.products.length === 0 ? (
              <AdminEmpty
                icon={Boxes}
                title="No products use this pool yet"
                description="Assign a product to this base unit to start drawing from shared inventory."
              />
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <caption className="sr-only">
                      Products drawing from the {pool.name} pool
                    </caption>
                    <thead className="border-b">
                      <tr>
                        <th
                          scope="col"
                          className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
                        >
                          Product
                        </th>
                        <th
                          scope="col"
                          className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
                        >
                          Units per purchase
                        </th>
                        <th
                          scope="col"
                          className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
                        >
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pool.products.map((product) => (
                        <tr key={product.id} className="hover:bg-muted/50">
                          <td className="px-6 py-4">
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="text-foreground font-medium hover:underline"
                            >
                              {product.name}
                            </Link>
                          </td>
                          <td className="text-foreground px-6 py-4">
                            {product.baseUnitsConsumed ?? 1}
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              variant={
                                product.published ? "default" : "secondary"
                              }
                            >
                              {product.published ? "Published" : "Draft"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>

          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <History className="h-4 w-4" />
              Movement history
            </h2>
            {pool.inventoryHistory.length === 0 ? (
              <AdminEmpty
                icon={History}
                title="No movement yet"
                description="Sales, returns, and manual adjustments to this pool will show up here."
              />
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <caption className="sr-only">
                      Movement history for the {pool.name} pool
                    </caption>
                    <thead className="border-b">
                      <tr>
                        <th
                          scope="col"
                          className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
                        >
                          Date
                        </th>
                        <th
                          scope="col"
                          className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
                        >
                          Reason
                        </th>
                        <th
                          scope="col"
                          className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
                        >
                          Change
                        </th>
                        <th
                          scope="col"
                          className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
                        >
                          Resulting qty
                        </th>
                        <th
                          scope="col"
                          className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
                        >
                          Order
                        </th>
                        <th
                          scope="col"
                          className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
                        >
                          By
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pool.inventoryHistory.map((entry) => (
                        <tr key={entry.id} className="hover:bg-muted/50">
                          <td className="text-foreground px-6 py-4 whitespace-nowrap">
                            {formatDate(entry.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className="capitalize">
                              {entry.reason}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={
                                entry.changeQty > 0
                                  ? "font-medium text-emerald-600"
                                  : entry.changeQty < 0
                                    ? "font-medium text-red-600"
                                    : "text-foreground"
                              }
                            >
                              {entry.changeQty > 0
                                ? `+${entry.changeQty}`
                                : entry.changeQty < 0
                                  ? `−${Math.abs(entry.changeQty)}`
                                  : entry.changeQty}
                            </span>
                          </td>
                          <td className="text-foreground px-6 py-4">
                            {entry.newQty}
                          </td>
                          <td className="px-6 py-4">
                            {entry.order ? (
                              <Link
                                href={`/admin/orders/${entry.order.id}`}
                                className="text-foreground hover:underline"
                              >
                                #{entry.order.orderNumber}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="text-foreground px-6 py-4">
                            {entry.user
                              ? (entry.user.name ?? entry.user.email)
                              : entry.order
                                ? `Order #${entry.order.orderNumber}`
                                : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>

        <p className="text-muted-foreground mt-6 text-xs">
          Units sold counts base units deducted by paid orders. Refunds and
          cancellations reduce it only when stock was restocked.
        </p>
      </div>
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const pool = await api.baseInventoryUnit.getById({ id }).catch(() => null);
  if (!pool) return { title: "Inventory Pool" };
  return { title: pool.name };
}
