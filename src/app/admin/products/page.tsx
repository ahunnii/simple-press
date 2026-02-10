import { Plus } from "lucide-react";

import Link from "next/link";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { redirect } from "next/navigation";
import { checkBusiness } from "~/lib/check-business";
import { api, HydrateClient } from "~/trpc/server";
import { ProductsTable } from "./_components/products-client-data-table";

export default async function ProductsPage() {
  const business = await checkBusiness();

  if (!business) {
    redirect("/admin/welcome");
  }

  const products = await api.product.secureListAll();

  return (
    <HydrateClient>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Products</h1>
              <p className="mt-1 text-gray-600">Manage your product catalog</p>
            </div>
            <Button asChild>
              <Link href="/admin/products/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Link>
            </Button>
          </div>

          {/* Products List */}
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
            <ProductsTable
              products={
                products as {
                  id: string;
                  name: string;
                  slug: string;
                  price: number;
                  published: boolean;
                  images: Array<{ url: string; altText: string | null }>;
                  _count: { variants: number };
                }[]
              }
            />
          )}
        </div>
      </div>
    </HydrateClient>
  );
}
