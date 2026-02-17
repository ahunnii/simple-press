import { ProductExporter } from "../_components/product-exporter";
import { TrailHeader } from "../../_components/trail-header";

export default async function ProductExportPage() {
  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Products", href: "/admin/products" },
          { label: "Export Products" },
        ]}
      />
      <ProductExporter />
    </>
  );
}

export const metadata = {
  title: "Export Products",
};
