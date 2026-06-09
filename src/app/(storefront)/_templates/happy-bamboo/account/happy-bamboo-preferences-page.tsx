"use client";

import { PageTransition } from "~/components/page-animations";

import type { AccountPreferencesPageProps } from "../../types";
import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";
import { HappyBambooAccountLayout } from "./happy-bamboo-account-layout";

export function HappyBambooPreferencesPage({
  business,
  customer,
}: AccountPreferencesPageProps) {
  return (
    <PageTransition>
      <HappyBambooAccountLayout
        heading="Preferences"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Account", href: "/account/settings" },
          { label: "Preferences" },
        ]}
      >
        <PreferencesContent business={business} customer={customer} />
      </HappyBambooAccountLayout>
    </PageTransition>
  );
}
