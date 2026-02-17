import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { GeneralSettings } from "../_components/general-settings";
import { TrailHeader } from "../../_components/trail-header";

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

      <GeneralSettings business={business} />
    </>
  );
}

export const metadata = {
  title: "General Settings",
};
