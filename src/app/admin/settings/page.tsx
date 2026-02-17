import { TrailHeader } from "../_components/trail-header";
import { SettingsDashboard } from "./_components/settings-dashboard";

export default async function SettingsPage() {
  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Settings" }]} />

      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Settings</h1>
            <p>Manage your website settings and integrations</p>
          </div>
        </div>

        <SettingsDashboard />
      </div>
    </>
  );
}

export const metadata = {
  title: "Settings",
};
