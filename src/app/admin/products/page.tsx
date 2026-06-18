import Link from "next/link";
import { Download, Plus, Upload } from "lucide-react";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { TrailHeader } from "../_components/trail-header";
import { ProductFilters } from "./_components/product-filters";
import { ProductsTable } from "./_components/products-client-data-table";
import { ProductsPagination } from "./_components/products-pagination";

type Props = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
};

const VALID_STATUS = ["all", "published", "draft"] as const;
const VALID_SORT = [
  "newest",
  "oldest",
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
] as const;

type ValidStatus = (typeof VALID_STATUS)[number];
type ValidSort = (typeof VALID_SORT)[number];

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await getSession();

  const search = params.search ?? undefined;
  const status = (
    VALID_STATUS.includes(params.status as ValidStatus)
      ? params.status
      : undefined
  ) as ValidStatus | undefined;
  const sort = (
    VALID_SORT.includes(params.sort as ValidSort) ? params.sort : undefined
  ) as ValidSort | undefined;
  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : undefined;

  const result = await api.product
    .secureList({ search, status, sort, page })
    .catch(rethrowTrpcForErrorBoundary);

  const { products, totalCount, totalPages } = result;

  const hasActiveFilters =
    !!search ||
    (status !== undefined && status !== "all") ||
    (sort !== undefined && sort !== "newest") ||
    (page !== undefined && page > 1);

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Products" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Products</h1>
            <p>Manage your product catalog</p>
          </div>

          <div className="flex gap-3">
            {session?.user.platformRole === "PLATFORM_ADMIN" && (
              <>
                <Button variant="outline" asChild size="sm">
                  <Link href="/admin/products/export">
                    <Download className="mr-2 h-4 w-4" />
                    Export to WordPress
                  </Link>
                </Button>

                <Button variant="outline" asChild size="sm">
                  <Link href="/admin/products/import">
                    <Upload className="mr-2 h-4 w-4" />
                    Import from WooCommerce
                  </Link>
                </Button>
              </>
            )}

            <Button asChild size="sm">
              <Link href="/admin/products/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <ProductFilters
          productCount={hasActiveFilters ? totalCount : undefined}
        />

        {/* Products List */}
        {products.length === 0 ? (
          hasActiveFilters ? (
            <Card>
              <CardHeader>
                <CardTitle>No products match your filters</CardTitle>
                <CardDescription>
                  Try adjusting your search or filters to find what you are
                  looking for.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No products yet</CardTitle>
                <CardDescription>
                  Get started by adding your first product
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/admin/products/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Product
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        ) : (
          <>
            <ProductsTable products={products} />
            <ProductsPagination
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
  title: "Products",
};
