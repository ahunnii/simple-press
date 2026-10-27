import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { requireAdminAccess } from "~/lib/require-admin-access";
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

  // API keys hand the store's catalog to an outside app, so they follow the
  // same owner-or-platform-admin rule as "Download your site". `membershipRole`
  // is null for PLATFORM_ADMIN (no membership row = full access). Managers and
  // staff get `apiKeys: null` and never see the card; the `apiToken.*`
  // procedures enforce the same rule server-side.
  const { membershipRole } = await requireAdminAccess();
  const apiKeys =
    membershipRole === null || membershipRole === "OWNER"
      ? await api.apiToken.list()
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
        quickbooks={quickbooks}
        apiKeys={apiKeys}
      />
    </>
  );
}

export const metadata = {
  title: "Integrations Settings",
};
