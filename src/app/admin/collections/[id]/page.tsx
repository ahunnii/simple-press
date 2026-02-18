import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { CollectionForm } from "../_components/collection-form";
import { TrailHeader } from "../../_components/trail-header";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCollectionPage({ params }: PageProps) {
  const { id } = await params;

  const collection = await api.collections.getById(id);

  if (!collection) notFound();

  const products = await api.product.secureGetAll();

  return (
    <div className="min-h-screen bg-gray-50">
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
  const collection = await api.collections.getById(id);
  if (!collection) notFound();
  return {
    title: collection.name ?? "Edit Collection",
  };
};
