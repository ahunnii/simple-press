import type { Variant } from "./_components/availability-editor";
import {
  maintenanceCtaSchema,
  normalizeMaintenanceMessage,
  normalizeMaintenanceText,
} from "~/lib/maintenance-config";
import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";
import { toWallClockInput } from "~/app/admin/events/_components/event-wall-clock";

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

  // The stored launch window is a UTC instant; `<input type="datetime-local">`
  // wants the wall clock as the *shop's* zone reads it. Formatting with the
  // ambient zone (the server's here, the browser's after hydration) would make
  // every edit lossy — see the header of `event-wall-clock.ts`.
  const launchStart = settings.maintenanceLaunchAt
    ? toWallClockInput(settings.maintenanceLaunchAt, false, settings.timeZone)
    : "";
  const launchEnd = settings.maintenanceLaunchEndAt
    ? toWallClockInput(
        settings.maintenanceLaunchEndAt,
        false,
        settings.timeZone,
      )
    : "";

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
        initialOverline={
          normalizeMaintenanceText(settings.maintenanceOverline) ?? ""
        }
        initialHeadline={
          normalizeMaintenanceText(settings.maintenanceHeadline) ?? ""
        }
        initialLocation={
          normalizeMaintenanceText(settings.maintenanceLocation) ?? ""
        }
        initialImage={settings.maintenanceImage}
        initialLaunchStart={launchStart}
        initialLaunchEnd={launchEnd}
        timeZone={settings.timeZone}
        businessPhoneNumber={settings.phoneNumber}
        businessSupportEmail={settings.supportEmail}
      />
    </>
  );
}

export const metadata = {
  title: "Maintenance Mode",
};
