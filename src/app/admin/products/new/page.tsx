import { HydrateClient } from "~/trpc/server";

import { ProductForm } from "../_components/product-form";
import { SiteHeader } from "../../_components/site-header";

export const metadata = {
  title: "Add Product",
};

export default async function NewProductPage() {
  return (
    <HydrateClient>
      <SiteHeader title="Add Product" />
      <div className="admin-container">
        <ProductForm />
      </div>
    </HydrateClient>
  );
}
