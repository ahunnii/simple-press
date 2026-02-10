import Link from "next/link";
import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { ProductForm } from "../_components/product-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  const product = await api.product.secureGet(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/admin/products"
            className="mb-2 inline-flex items-center text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
          >
            <span className="mr-2 text-lg">&larr;</span>
            Back to products
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
          <p className="mt-1 text-gray-600">Update product details</p>
        </div>

        <ProductForm product={product} />
      </div>
    </div>
  );
}
