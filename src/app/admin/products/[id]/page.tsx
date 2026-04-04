import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { ProductForm } from "../_components/product-form";
import { TrailHeader } from "../../_components/trail-header";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  const [product, flags] = await Promise.all([
    api.product.secureGet(id).catch(rethrowTrpcForErrorBoundary),
    getBusinessFlags(),
  ]);

  if (!product) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Products", href: "/admin/products" },
          { label: product.name },
        ]}
      />

      <ProductForm product={product} galleriesEnabled={flags.isEnabled("galleries")} />
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
