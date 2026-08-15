import { Info } from "lucide-react";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";

import { TrailHeader } from "../../_components/trail-header";
import { ProductExporter } from "./_components/product-exporter";

export default async function ProductExportPage() {
  const { session, membershipRole } = await requireAdminAccess();

  // `membershipRole` is null for PLATFORM_ADMIN — they have no
  // BusinessMembership row, so `requireAdminAccess` skips the membership
  // lookup for them. Treat that null as full access rather than "not an
  // owner" — mirrors the `canManage` logic in settings/team/page.tsx.
  const isPlatformAdmin = session.user.platformRole === "PLATFORM_ADMIN";
  const canExport = isPlatformAdmin || membershipRole === "OWNER";

  const { isEnabled } = await getBusinessFlags();

  if (!isEnabled("wordpressExport")) {
    return <GenericFeatureDisabledPage featureName="Export to WordPress" />;
  }

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Products", href: "/admin/products" },
          { label: "Export Products" },
        ]}
      />

      {canExport ? (
        <ProductExporter />
      ) : (
        // Owner-only Alert, mirroring settings/data/page.tsx:76-84 — the
        // button that links here is already gated to `canExportProducts` on
        // /admin/products, so a MANAGER/STAFF landing here typed the URL
        // directly.
        <div className="admin-container">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Exporting products is Owner-only</AlertTitle>
            <AlertDescription>
              Only the store owner can download a CSV export of the product
              catalog.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
}

export const metadata = {
  title: "Export Products",
};
