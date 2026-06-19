"use client";

import type { AccountPreferencesPageProps } from "../../types";
import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import { ElegantAccountLayout } from "./elegant-account-layout";

export function ElegantPreferencesPage({
  business,
  customer,
}: AccountPreferencesPageProps) {
  return (
    <ElegantAccountLayout heading="Preferences">
      <PreferencesContent business={business} customer={customer} />
    </ElegantAccountLayout>
  );
}
