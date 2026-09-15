import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { LoyaltySettings } from "./_components/loyalty-settings";

export default async function LoyaltySettingsPage() {
  // Ungated read (see the docblock on `loyalty.getSettings`) — this page
  // must render correctly whether or not the `loyalty` flag is on, since one
  // of its two possible alerts below is exactly "this flag is off".
  const settings = await api.loyalty.getSettings();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Rewards" },
        ]}
      />
      <HubSubNav hub="settings" />

      <LoyaltySettings initial={settings} />
    </>
  );
}

export const metadata = {
  title: "Rewards",
};
