import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { TrailHeader } from "../../_components/trail-header";
import { ShippingSettings } from "./_components/shipping-settings";

export default async function ShippingSettingsPage() {
  const business = await api.business.getWith({ includeSiteContent: true });

  if (!business) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Shipping" },
        ]}
      />

      <ShippingSettings business={business} />
    </>
  );
}

export const metadata = {
  title: "Shipping Settings",
};
