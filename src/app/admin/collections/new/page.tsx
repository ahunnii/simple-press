import { api } from "~/trpc/server";

import { CollectionForm } from "../_components/collection-form";
import { TrailHeader } from "../../_components/trail-header";

export default async function NewCollectionPage() {
  const products = await api.product.secureGetAll();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Collections", href: "/admin/collections" },
          { label: "New Collection" },
        ]}
      />
      <CollectionForm allProducts={products} />
    </>
  );
}

export const metadata = {
  title: "New Collection",
};
