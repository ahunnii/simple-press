import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { ProductForm } from "../_components/product-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  // Get product
  const product = await api.product.secureGet(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
          <p className="mt-1 text-gray-600">Update product details</p>
        </div>

        <ProductForm
          businessId={product.businessId}
          product={
            product as unknown as {
              id: string;
              name: string;
              slug: string;
              description: string | null;
              price: number;
              published: boolean;
            }
          }
        />
      </div>
    </div>
  );
}
