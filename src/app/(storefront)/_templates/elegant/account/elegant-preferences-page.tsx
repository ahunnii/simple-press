"use client";

import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import type { AccountPreferencesPageProps } from "../../types";
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
