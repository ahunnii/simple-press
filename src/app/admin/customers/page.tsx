import { Users } from "lucide-react";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { AdminEmpty } from "../_components/admin-empty";
import { TrailHeader } from "../_components/trail-header";
import { CustomerFilters } from "./_components/customer-filters";
import { CustomersPagination } from "./_components/customers-pagination";
import { CustomersTable } from "./_components/customers-table";

type Props = {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
};

export default async function CustomersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : undefined;

  const result = await api.customer
    .list({ search: params.search, page })
    .catch(rethrowTrpcForErrorBoundary);

  const { customers, totalCount, totalPages, stats } = result;
  const { totalCustomers, marketingCount } = stats;

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

        <CustomerFilters customerCount={totalCount} />

        {customers.length === 0 ? (
          <AdminEmpty
            icon={Users}
            title={params.search ? "No matching customers" : "No customers yet"}
            description={params.search ? "No customers match your search." : "Customers appear here after their first order or when they create an account on your storefront."}
            filtered={!!params.search}
          />
        ) : (
          <>
            <CustomersTable customers={customers} />
            <CustomersPagination
              page={result.page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={result.pageSize}
            />
          </>
        )}
      </div>
    </>
  );
}

export const metadata = {
  title: "Customers",
};
