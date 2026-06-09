"use client";

import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import type { AccountPreferencesPageProps } from "../../types";
import { DarkTrendAccountLayout } from "./dark-trend-account-layout";

export function DarkTrendPreferencesPage({
  business,
  customer,
}: AccountPreferencesPageProps) {
  return (
    <DarkTrendAccountLayout heading="Preferences">
      <PreferencesContent business={business} customer={customer} />
    </DarkTrendAccountLayout>
  );
}
