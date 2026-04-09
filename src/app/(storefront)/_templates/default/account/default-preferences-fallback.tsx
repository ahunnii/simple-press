"use client";

import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import type { AccountPreferencesPageProps } from "../../types";
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
