"use client";

import type { AccountPreferencesPageProps } from "../../types";
import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import { UmscAccountLayout } from "./umsc-account-layout";

export function UmscPreferencesPage({
  business,
  customer,
}: AccountPreferencesPageProps) {
  return (
    <UmscAccountLayout
      heading="Preferences"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Preferences" },
      ]}
    >
      <PreferencesContent business={business} customer={customer} />
    </UmscAccountLayout>
  );
}
