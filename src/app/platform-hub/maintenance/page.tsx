import { api } from "~/trpc/server";

import { PlatformTrailHeader } from "../_components/platform-trail-header";
import { MaintenanceControl } from "./_components/maintenance-control";

export default async function PlatformMaintenancePage() {
  const maintenance = await api.platform.getMaintenance();

  return (
    <>
      <PlatformTrailHeader breadcrumbs={[{ label: "Maintenance" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Platform Maintenance</h1>
            <p>
              Take the entire platform offline for scheduled maintenance or
              emergency updates
            </p>
          </div>
        </div>

        <MaintenanceControl
          initialEnabled={maintenance.enabled}
          initialMessage={maintenance.message}
        />
      </div>
    </>
  );
}

export const metadata = {
  title: "Platform Maintenance",
};
