import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { getSession } from "~/server/better-auth/server";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { StoreTransferClient } from "./_components/store-transfer-client";

export default async function StoreTransferPage() {
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("storeTransfer")) {
    return <GenericFeatureDisabledPage featureName="Store Transfer" />;
  }

  const session = await getSession();
  const isPlatformAdmin = session?.user.platformRole === "PLATFORM_ADMIN";

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Store Transfer" },
        ]}
      />
      <HubSubNav hub="settings" />

      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Store Transfer</h1>
            <p>Export your store content or import from a ZIP archive</p>
          </div>
        </div>

        <StoreTransferClient isPlatformAdmin={isPlatformAdmin} />
      </div>
    </>
  );
}

export const metadata = {
  title: "Store Transfer",
};
