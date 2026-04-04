import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { ProductForm } from "../_components/product-form";
import { TrailHeader } from "../../_components/trail-header";

export default async function NewProductPage() {
  const flags = await getBusinessFlags();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Products", href: "/admin/products" },
          { label: "New Product" },
        ]}
      />

      <ProductForm galleriesEnabled={flags.isEnabled("galleries")} />
    </>
  );
}
export const metadata = {
  title: "New Product",
};
