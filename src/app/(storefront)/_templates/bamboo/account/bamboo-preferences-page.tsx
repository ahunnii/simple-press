"use client";

import type { AccountPreferencesPageProps } from "../../types";
import { PageTransition } from "~/components/page-animations";
import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import { BambooAccountLayout } from "./bamboo-account-layout";

export function BambooPreferencesPage({
  business,
  customer,
}: AccountPreferencesPageProps) {
  return (
    <PageTransition>
      <BambooAccountLayout heading="Preferences">
        <PreferencesContent business={business} customer={customer} />
      </BambooAccountLayout>
    </PageTransition>
  );
}
