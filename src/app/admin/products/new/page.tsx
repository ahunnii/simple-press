import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { api } from "~/trpc/server";
import { ProductForm } from "../_components/product-form";
import { TrailHeader } from "../../_components/trail-header";

export default async function NewProductPage() {
  const [flags, pools] = await Promise.all([
    getBusinessFlags(),
    api.baseInventoryUnit.list(),
  ]);

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Products", href: "/admin/products" },
          { label: "New Product" },
        ]}
      />

      <ProductForm galleriesEnabled={flags.isEnabled("galleries")} pools={pools} />
    </>
  );
}
export const metadata = {
  title: "New Product",
};
