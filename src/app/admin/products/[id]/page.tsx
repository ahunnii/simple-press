import Link from "next/link";
import { notFound } from "next/navigation";

import { api, HydrateClient } from "~/trpc/server";

import { ProductForm } from "../_components/product-form";
import { SiteHeader } from "../../_components/site-header";

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
    <HydrateClient>
      <SiteHeader title="Edit Product" />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <ProductForm product={product} />
      </div>
    </HydrateClient>
  );
}
