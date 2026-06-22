import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { TrailHeader } from "../../_components/trail-header";
import { OrdersTable } from "../../orders/_components/orders-table";
import { CustomerPrivacyActions } from "./_components/customer-privacy-actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;

  const customer = await api.customer
    .getById(id)
    .catch(rethrowTrpcForErrorBoundary);

  if (!customer) {
    notFound();
  }

  const name =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") || null;

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Customers", href: "/admin/customers" },
          { label: name ?? customer.email },
        ]}
      />

      <div className="admin-form-toolbar">
        <div className="toolbar-info">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/admin/customers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <h1 className="text-base font-medium">{name ?? customer.email}</h1>
            <Badge variant="outline">
              Joined {formatDate(customer.createdAt)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="admin-container">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left — order history */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">Order History</h2>
            {customer.orders.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No orders yet</CardTitle>
                  <CardDescription>
                    This customer hasn&apos;t placed any orders.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <OrdersTable
                orders={customer.orders.map((o) => ({
                  ...o,
                  shippingAddress: o.shippingAddress ?? undefined,
                }))}
              />
            )}
          </div>

          {/* Right — customer info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{name}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{customer.email}</p>
                </div>
                {customer.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{customer.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Marketing</p>
                  <Badge
                    variant={
                      customer.acceptsMarketing ? "default" : "secondary"
                    }
                  >
                    {customer.acceptsMarketing ? "Opted in" : "Opted out"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{customer.orderCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold">
                    {formatPrice(
                      customer.orders.reduce((sum, o) => sum + o.total, 0),
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            <CustomerPrivacyActions
              customer={{
                id: customer.id,
                deletionRequestedAt: customer.deletionRequestedAt,
                anonymizedAt: customer.anonymizedAt,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const customer = await api.customer.getById(id);
  if (!customer) return { title: "Customer" };
  const name = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ");
  return { title: name || customer.email };
}
