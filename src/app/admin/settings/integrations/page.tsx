import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { IntegrationsSettings } from "../_components/integrations-settings";
import { TrailHeader } from "../../_components/trail-header";

export default async function IntegrationsSettingsPage() {
  const business = await api.business.get();

  if (!business) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Integrations" },
        ]}
      />

      <IntegrationsSettings business={business} />
    </>
  );
}

export const metadata = {
  title: "Integrations Settings",
};
