import { env } from "~/env";
import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { DomainSettings } from "./_components/domain-settings";

export default async function DomainSettingsPage() {
  const business = await api.business.getWith({});

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Domain Settings" },
        ]}
      />
      <HubSubNav hub="settings" />

      <DomainSettings business={business} vpsIp={env.VPS_IP} />
    </>
  );
}

export const metadata = {
  title: "Domain Settings",
};
