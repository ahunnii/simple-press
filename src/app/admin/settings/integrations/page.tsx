import { api } from "~/trpc/server";

import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";
import { TrailHeader } from "../../_components/trail-header";
import { IntegrationsSettings } from "./_components/integrations-settings";

export default async function IntegrationsSettingsPage() {
  const business = await api.business.getWithIntegrations();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Integrations" },
        ]}
      />
      <HubSubNav hub="settings" />

      <IntegrationsSettings business={business} />
    </>
  );
}

export const metadata = {
  title: "Integrations Settings",
};
