import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { SettingsDashboard } from "./_components/settings-dashboard";

export default async function SettingsPage() {
  const business = await api.business.get();

  if (!business) notFound();

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
