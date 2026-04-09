"use client";

import { PageTransition } from "~/components/page-animations";
import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import type { AccountPreferencesPageProps } from "../../types";
import { NoiseAccountLayout } from "./noise-account-layout";

export function NoisePreferencesPage({ business, customer }: AccountPreferencesPageProps) {
  return (
    <PageTransition>
      <NoiseAccountLayout heading="Preferences">
        <PreferencesContent business={business} customer={customer} />
      </NoiseAccountLayout>
    </PageTransition>
  );
}
