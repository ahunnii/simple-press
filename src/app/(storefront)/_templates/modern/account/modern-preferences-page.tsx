"use client";

import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import type { AccountPreferencesPageProps } from "../../types";
import { ModernAccountLayout } from "./modern-account-layout";

export function ModernPreferencesPage({
  business,
  customer,
}: AccountPreferencesPageProps) {
  return (
    <ModernAccountLayout heading="Preferences">
      <PreferencesContent business={business} customer={customer} />
    </ModernAccountLayout>
  );
}
