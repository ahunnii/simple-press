import { TrailHeader } from "../../_components/trail-header";
import { ProductImportWizard } from "./_components/product-import-wizard";

export default async function ProductImportPage() {
  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Products", href: "/admin/products" },
          { label: "Import Products" },
        ]}
      />

      <ProductImportWizard />
    </>
  );
}

export const metadata = {
  title: "Import Products",
};
