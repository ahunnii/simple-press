import Link from "next/link";
import { Plus } from "lucide-react";

import { api, HydrateClient } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { SiteHeader } from "../_components/site-header";
import { ProductsTable } from "./_components/products-client-data-table";

export const metadata = {
  title: "Products Admin",
};

export default async function ProductsPage() {
  const products = await api.product.secureListAll();

  return (
    <HydrateClient>
      <SiteHeader title="Products" />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Products</h1>
            <p>Manage your product catalog</p>
          </div>
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </div>

        {products.length === 0 ? (
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
        ) : (
          <ProductsTable products={products} />
        )}
      </div>
    </HydrateClient>
  );
}
