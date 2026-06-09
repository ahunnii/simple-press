import { env } from "~/env";
import { api } from "~/trpc/server";

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

      <DomainSettings business={business} vpsIp={env.VPS_IP} />
    </>
  );
}

export const metadata = {
  title: "Domain Settings",
};
