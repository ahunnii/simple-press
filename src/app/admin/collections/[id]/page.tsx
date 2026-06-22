import { notFound } from "next/navigation";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { CollectionForm } from "../_components/collection-form";
import { TrailHeader } from "../../_components/trail-header";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCollectionPage({ params }: PageProps) {
  const { id } = await params;

  const collection = await api.collections
    .getById(id)
    .catch(rethrowTrpcForErrorBoundary);

  if (!collection) notFound();

  const products = await api.product
    .secureGetAll()
    .catch(rethrowTrpcForErrorBoundary);

  return (
    <div className="min-h-screen bg-muted/40">
      <TrailHeader
        breadcrumbs={[
          { label: "Collections", href: "/admin/collections" },
          { label: collection.name },
        ]}
      />
      <CollectionForm allProducts={products} collection={collection} />
    </div>
  );
}

export const generateMetadata = async ({ params }: PageProps) => {
  const { id } = await params;
  const collection = await api.collections
    .getById(id)
    .catch(rethrowTrpcForErrorBoundary);
  if (!collection) notFound();
  return {
    title: `Edit ${collection?.name ?? "Collection"}`,
  };
};
