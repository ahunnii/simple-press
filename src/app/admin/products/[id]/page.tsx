import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { ProductForm } from "../_components/product-form";
import { TrailHeader } from "../../_components/trail-header";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  const product = await api.product.secureGet(id);

  if (!product) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Products", href: "/admin/products" },
          { label: product.name },
        ]}
      />

      <ProductForm product={product} />
    </>
  );
}

export const metadata = {
  title: "Edit Product",
};
