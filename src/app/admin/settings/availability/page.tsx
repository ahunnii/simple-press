import type { Variant } from "./_components/availability-editor";
import { api } from "~/trpc/server";

import { TrailHeader } from "../../_components/trail-header";
import { AvailabilityEditor } from "./_components/availability-editor";

export default async function StorefrontAvailabilityPage() {
  const settings = await api.business.getMaintenanceSettings();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Storefront Availability" },
        ]}
      />

      <AvailabilityEditor
        initialMaintenanceMode={settings.maintenanceMode}
        initialMaintenanceVariant={settings.maintenanceVariant as Variant}
        initialMaintenanceMessage={settings.maintenanceMessage}
      />
    </>
  );
}

export const metadata = {
  title: "Storefront Availability",
};
