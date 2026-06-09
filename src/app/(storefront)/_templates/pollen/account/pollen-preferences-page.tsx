"use client";

import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import type { AccountPreferencesPageProps } from "../../types";
import { PollenAccountLayout } from "./pollen-account-layout";

export function PollenPreferencesPage({
  business,
  customer,
}: AccountPreferencesPageProps) {
  return (
    <PollenAccountLayout heading="Preferences">
      <PreferencesContent business={business} customer={customer} />
    </PollenAccountLayout>
  );
}
