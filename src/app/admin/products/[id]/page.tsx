import { notFound } from "next/navigation";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { ProductForm } from "../_components/product-form";
import { TrailHeader } from "../../_components/trail-header";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  const product = await api.product
    .secureGet(id)
    .catch(rethrowTrpcForErrorBoundary);

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

export const generateMetadata = async ({ params }: Props) => {
  const { id } = await params;
  const product = await api.product
    .secureGet(id)
    .catch(rethrowTrpcForErrorBoundary);
  if (!product) notFound();
  return {
    title: `Edit ${product?.name ?? "Product"}`,
  };
};
