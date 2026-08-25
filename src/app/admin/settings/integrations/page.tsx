import { env } from "~/env";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
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

  // `quickbooks` is a PLATFORM_ADMIN-only flag (see the docblock on
  // `quickbooksRouter`) — `getConnection` is behind `featureGate("quickbooks")`
  // server-side, so calling it while the flag is off would throw. Checking the
  // flag first means every other business simply gets `quickbooks: null` and
  // the card below never renders — no gated tRPC call, no layout shift.
  const flags = await getBusinessFlags();
  const quickbooks = flags.isEnabled("quickbooks")
    ? await api.quickbooks.getConnection()
    : null;

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
        quickbooks={quickbooks}
      />
    </>
  );
}

export const metadata = {
  title: "Integrations Settings",
};
