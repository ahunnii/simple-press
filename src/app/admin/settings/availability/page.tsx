import type { Variant } from "./_components/availability-editor";
import {
  maintenanceCtaSchema,
  normalizeMaintenanceMessage,
} from "~/lib/maintenance-config";
import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { AvailabilityEditor } from "./_components/availability-editor";

export default async function StorefrontAvailabilityPage() {
  const settings = await api.business.getMaintenanceSettings();

  // Both columns are loose `Json` — anything that doesn't round-trip through
  // the shared schemas is treated as "not set" rather than crashing the page.
  const maintenanceMessage = normalizeMaintenanceMessage(
    settings.maintenanceMessage,
  );
  const parsedCta = maintenanceCtaSchema.safeParse(settings.maintenanceCta);

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Maintenance Mode" },
        ]}
      />
      <HubSubNav hub="settings" />

      <AvailabilityEditor
        initialMaintenanceMode={settings.maintenanceMode}
        initialMaintenanceVariant={settings.maintenanceVariant as Variant}
        initialMaintenanceMessage={maintenanceMessage}
        initialMaintenanceCta={parsedCta.success ? parsedCta.data : null}
        businessPhoneNumber={settings.phoneNumber}
        businessSupportEmail={settings.supportEmail}
      />
    </>
  );
}

export const metadata = {
  title: "Maintenance Mode",
};
