import { getBusinessPostalAddress } from "~/lib/marketing/render-campaign";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { api } from "~/trpc/server";

import { TrailHeader } from "../../_components/trail-header";
import { ContactImportWizard } from "./_components/contact-import-wizard";

type Props = {
  searchParams: Promise<{ importId?: string }>;
};

export default async function ContactImportPage({ searchParams }: Props) {
  // PLATFORM_ADMIN only, like /admin/products/import: `allowedRoles: []` denies
  // every BusinessMembership role (OWNER, MANAGER, STAFF) while a platform admin
  // bypasses the membership check. `contactImport.preview/commit/queueInvite`
  // enforce the same rule server-side. Owners and managers can read the log at
  // ./history.
  await requireAdminAccess({ allowedRoles: [] });

  const { importId } = await searchParams;
  const business = await api.business.simplifiedGet();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Customers", href: "/admin/customers" },
          { label: "Import contacts" },
        ]}
      />
      <ContactImportWizard
        businessName={business?.name ?? "us"}
        hasPostalAddress={
          business !== null && getBusinessPostalAddress(business) !== null
        }
        initialImportId={importId?.trim() ? importId.trim() : null}
      />
    </>
  );
}

export const metadata = {
  title: "Import contacts",
};
