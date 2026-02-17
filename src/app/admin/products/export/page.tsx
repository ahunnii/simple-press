import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { ProductExporter } from "../_components/product-exporter";
import { TrailHeader } from "../../_components/trail-header";

export default async function ProductExportPage() {
  const business = await api.business.get();

  if (!business) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Products", href: "/admin/products" },
          { label: "Export Products" },
        ]}
      />
      <ProductExporter business={business} />
    </>
  );
}

export const metadata = {
  title: "Export Products",
};
