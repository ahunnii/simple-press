import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { BusinessHoursSettings } from "./_components/business-hours-settings";

export default async function BusinessHoursSettingsPage() {
  const business = await api.business.getWith({ includeSiteContent: false });

  if (!business) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Business Hours" },
        ]}
      />
      <HubSubNav hub="settings" />

      <BusinessHoursSettings business={business} />
    </>
  );
}

export const metadata = {
  title: "Business Hours",
};
