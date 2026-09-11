"use client";

import type { AccountPreferencesPageProps } from "../../types";
import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import { BambooAccountLayout } from "./bamboo-account-layout";

/** See `bamboo-account-settings-page.tsx` — same bridge-token contract. */
export function BambooPreferencesPage({
  business,
  customer,
}: AccountPreferencesPageProps) {
  return (
    <BambooAccountLayout heading="Preferences">
      <div className="flex flex-col gap-6">
        <PreferencesContent business={business} customer={customer} />
      </div>
    </BambooAccountLayout>
  );
}
