import { env } from "~/env";
import { getPaymentsHealth } from "~/lib/stripe/payments-health";
import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { IntegrationsSettings } from "./_components/integrations-settings";

export default async function IntegrationsSettingsPage() {
  const business = await api.business.getWithIntegrations();

  // Same verified-against-Stripe value the admin-wide "Payments are paused"
  // strip uses, so this page can never say "Connected" while the strip says
  // charges are disabled. Cached inside the helper; the normal case costs
  // nothing.
  const paymentsHealth = await getPaymentsHealth(business);

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Integrations" },
        ]}
      />
      <HubSubNav hub="settings" />

      <IntegrationsSettings
        business={business}
        paymentsHealth={paymentsHealth}
        umamiBaseUrl={env.UMAMI_BASE_URL}
      />
    </>
  );
}

export const metadata = {
  title: "Integrations Settings",
};
