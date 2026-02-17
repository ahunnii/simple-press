import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { ProductImportWizard } from "../_components/product-import-wizard";
import { TrailHeader } from "../../_components/trail-header";

export default async function ProductImportPage() {
  const business = await api.business.get();

  if (!business) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Products", href: "/admin/products" },
          { label: "Import Products" },
        ]}
      />

      <ProductImportWizard business={business} />
    </>
  );
}

export const metadata = {
  title: "Import Products",
};
