import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { TrailHeader } from "../_components/trail-header";
import { CustomerFilters } from "./_components/customer-filters";
import { CustomersTable } from "./_components/customers-table";

type Props = {
  searchParams: Promise<{
    search?: string;
  }>;
};

export default async function CustomersPage({ searchParams }: Props) {
  const params = await searchParams;

  const customers = await api.customer
    .list({ search: params.search })
    .catch(rethrowTrpcForErrorBoundary);

  const totalCustomers = customers.length;
  const marketingCount = customers.filter((c) => c.acceptsMarketing).length;

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Customers" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Customers</h1>
            <p>View and search your customer list</p>
          </div>
        </div>

        {!params.search && (
          <div className="mb-8 grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Customers</CardDescription>
                <CardTitle className="text-3xl">{totalCustomers}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Accepts Marketing</CardDescription>
                <CardTitle className="text-3xl">{marketingCount}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        <CustomerFilters customerCount={totalCustomers} />

        {customers.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No customers found</CardTitle>
              <CardDescription>
                {params.search
                  ? "Try a different search term."
                  : "Customers will appear here once orders are placed."}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <CustomersTable customers={customers} />
        )}
      </div>
    </>
  );
}

export const metadata = {
  title: "Customers",
};
