import { api } from "~/trpc/server";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { InvoiceSettingsForm } from "./_components/invoice-settings-form";

export default async function InvoiceSettingsPage() {
  // Ungated read (`invRead` in `routers/invoice.ts`) — the settings row must
  // always be readable even with the flag off, so this page can tell "off"
  // from "on with nothing configured yet".
  const settings = await api.invoice.getSettings();

  if (!settings.invoicesEnabled) {
    return <GenericFeatureDisabledPage featureName="Invoices" />;
  }

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Invoices" },
        ]}
      />
      <HubSubNav hub="settings" />

      <InvoiceSettingsForm initial={settings} />
    </>
  );
}

export const metadata = {
  title: "Invoice Settings",
};
