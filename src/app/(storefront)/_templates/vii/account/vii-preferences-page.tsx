"use client";

import type { AccountPreferencesPageProps } from "../../types";
import { PageTransition } from "~/components/page-animations";
import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import { ViiAccountLayout } from "./vii-account-layout";

export function ViiPreferencesPage({
  business,
  customer,
}: AccountPreferencesPageProps) {
  return (
    <PageTransition>
      <ViiAccountLayout
        heading="Preferences"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Account", href: "/account/settings" },
          { label: "Preferences" },
        ]}
      >
        <PreferencesContent business={business} customer={customer} />
      </ViiAccountLayout>
    </PageTransition>
  );
}
