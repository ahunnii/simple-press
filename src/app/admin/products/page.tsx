import Link from "next/link";
import { Download, Plus, Upload } from "lucide-react";

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
    <>
      <SiteHeader title="Products" />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Products</h1>
            <p>Manage your product catalog</p>
          </div>
          {/* <Button variant="outline" asChild>
            <Link href="/admin/products/import">
              <Upload className="mr-2 h-4 w-4" />
              Import from WooCommerce
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Link>
          </Button> */}

          <div className="flex gap-3">
            {/* Export button */}
            <Button variant="outline" asChild>
              <Link href="/admin/products/export">
                <Download className="mr-2 h-4 w-4" />
                Export to WordPress
              </Link>
            </Button>

            {/* Import button */}
            <Button variant="outline" asChild>
              <Link href="/admin/products/import">
                <Upload className="mr-2 h-4 w-4" />
                Import from WooCommerce
              </Link>
            </Button>

            {/* Add product button */}
            <Button asChild>
              <Link href="/admin/products/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Link>
            </Button>
          </div>
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
    </>
  );
}
