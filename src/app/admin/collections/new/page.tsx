import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { CollectionForm } from "../_components/collection-form";
import { TrailHeader } from "../../_components/trail-header";

export default async function NewCollectionPage() {
  const business = await api.business.get();
  if (!business) notFound();

  const products = await api.product.secureGetAll();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Collections", href: "/admin/collections" },
          { label: "New Collection" },
        ]}
      />
      <CollectionForm businessId={business.id} allProducts={products} />
    </>
  );
}

export const metadata = {
  title: "New Collection",
};
