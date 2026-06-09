"use client";

import type { AccountPreferencesPageProps } from "../../types";
import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import { DefaultAccountLayout } from "./default-account-layout";

export function DefaultPreferencesFallback({
  business,
  customer,
}: AccountPreferencesPageProps) {
  return (
    <DefaultAccountLayout heading="Preferences">
      <PreferencesContent business={business} customer={customer} />
    </DefaultAccountLayout>
  );
}
