import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { GeneralSettings } from "./_components/general-settings";

export default async function GeneralSettingsPage() {
  const business = await api.business.getWith({ includeSiteContent: true });

  if (!business) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "General" },
        ]}
      />
      <HubSubNav hub="settings" />

      <GeneralSettings business={business} />
    </>
  );
}

export const metadata = {
  title: "General Settings",
};
