"use client";

import type { AccountPreferencesPageProps } from "../../types";
import { PageTransition } from "~/components/page-animations";
import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import { PinkAccountLayout } from "./pink-account-layout";

export function PinkPreferencesPage({
  business,
  customer,
}: AccountPreferencesPageProps) {
  return (
    <PageTransition>
      <PinkAccountLayout
        title="Preferences"
        description={`Control what ${business.name} sends you.`}
      >
        <PreferencesContent business={business} customer={customer} />
      </PinkAccountLayout>
    </PageTransition>
  );
}
