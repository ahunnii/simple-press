import { notFound } from "next/navigation";

import { getPaymentsHealth } from "~/lib/stripe/payments-health";
import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { DonationsSettings } from "./_components/donations-settings";

export default async function DonationsSettingsPage() {
  // `getWith` omits the Stripe identity scalars (see the `omit` comment on
  // that procedure), so the Stripe-connection callout below needs the same
  // verified-against-Stripe source the Integrations page uses rather than
  // trusting `stripeChargesEnabled` alone.
  const [business, integrations] = await Promise.all([
    api.business.getWith({}),
    api.business.getWithIntegrations(),
  ]);

  if (!business) notFound();

  const paymentsHealth = await getPaymentsHealth(integrations);

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Donations" },
        ]}
      />
      <HubSubNav hub="settings" />

      <DonationsSettings business={business} paymentsHealth={paymentsHealth} />
    </>
  );
}

export const metadata = {
  title: "Donations Settings",
};
