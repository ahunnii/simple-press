import { api } from "~/trpc/server";

import { CollectionForm } from "../_components/collection-form";
import { TrailHeader } from "../../_components/trail-header";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCollectionPage({ params }: PageProps) {
  const { id } = await params;

  const collection = await api.collections.getById({ id });
  const products = await api.product.secureGetAll();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Collections", href: "/admin/collections" },
          { label: collection.name },
        ]}
      />
      <CollectionForm
        businessId={collection.businessId}
        collectionId={id}
        allProducts={products}
      />
    </>
  );
}

export const metadata = {
  title: "Edit Collection",
};
