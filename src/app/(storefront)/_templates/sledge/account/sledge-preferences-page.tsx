"use client";

import type { AccountPreferencesPageProps } from "../../types";
import { PageTransition } from "~/components/page-animations";
import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import { SledgeAccountLayout } from "./sledge-account-layout";

export function SledgePreferencesPage({
  business,
  customer,
}: AccountPreferencesPageProps) {
  return (
    <PageTransition className="bg-white">
      <SledgeAccountLayout heading="Preferences">
        <PreferencesContent business={business} customer={customer} />
      </SledgeAccountLayout>
    </PageTransition>
  );
}
