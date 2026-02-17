import { api } from "~/trpc/server";

import { DomainSettings } from "../_components/domain-settings";
import { TrailHeader } from "../../_components/trail-header";

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

      <DomainSettings business={business} />
    </>
  );
}

export const metadata = {
  title: "Domain Settings",
};
