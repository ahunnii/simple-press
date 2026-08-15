import { requireAdminAccess } from "~/lib/require-admin-access";

import { TrailHeader } from "../../_components/trail-header";
import { ProductImportWizard } from "./_components/product-import-wizard";

export default async function ProductImportPage() {
  // PLATFORM_ADMIN only — unlike export (gated behind the owner-facing
  // `wordpressExport` flag), there is no flag describing "import": it's a
  // bulk-create wizard that writes product rows from an arbitrary CSV, and
  // its only entry point (the button on /admin/products) is already
  // platform-admin-only. `allowedRoles: []` denies every BusinessMembership
  // role (OWNER, MANAGER, STAFF all redirect to /not-permitted), while
  // PLATFORM_ADMIN still bypasses the membership check entirely — see
  // require-admin-access.ts.
  await requireAdminAccess({ allowedRoles: [] });

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
