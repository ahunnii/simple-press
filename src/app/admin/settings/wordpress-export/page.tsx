import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { getSession } from "~/server/better-auth/server";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { WordPressExportClient } from "./_components/wordpress-export-client";

export default async function WordPressExportPage() {
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("wordpressExport")) {
    return <GenericFeatureDisabledPage featureName="Export to WordPress" />;
  }

  const session = await getSession();
  const isPlatformAdmin = session?.user.platformRole === "PLATFORM_ADMIN";

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Export to WordPress" },
        ]}
      />
      <HubSubNav hub="settings" />

      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Export to WordPress</h1>
            <p>
              Download your store content in WordPress/WooCommerce import
              formats
            </p>
          </div>
        </div>

        <WordPressExportClient isPlatformAdmin={isPlatformAdmin} />
      </div>
    </>
  );
}

export const metadata = {
  title: "Export to WordPress",
};
