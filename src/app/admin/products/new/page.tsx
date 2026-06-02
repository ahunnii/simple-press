import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { api } from "~/trpc/server";
import { ProductForm } from "../_components/product-form";
import { TrailHeader } from "../../_components/trail-header";

export default async function NewProductPage() {
  const [flags, pools] = await Promise.all([
    getBusinessFlags(),
    api.baseInventoryUnit.list(),
  ]);

  const allCollections = flags.isEnabled("collections")
    ? await api.collections.getAll()
    : [];

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Products", href: "/admin/products" },
          { label: "New Product" },
        ]}
      />

      <ProductForm
        galleriesEnabled={flags.isEnabled("galleries")}
        collectionsEnabled={flags.isEnabled("collections")}
        allCollections={allCollections}
        pools={pools}
      />
    </>
  );
}
export const metadata = {
  title: "New Product",
};
