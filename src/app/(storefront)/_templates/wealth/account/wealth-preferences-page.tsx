"use client";

import type { AccountPreferencesPageProps } from "../../types";
import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import { WealthReveal } from "../shared/wealth-reveal";
import { WealthAccountLayout } from "./wealth-account-layout";

export function WealthPreferencesPage({ business, customer }: AccountPreferencesPageProps) {
  return (
    <WealthAccountLayout
      heading="Preferences"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Preferences" },
      ]}
    >
      <WealthReveal>
        <PreferencesContent business={business} customer={customer} />
      </WealthReveal>
    </WealthAccountLayout>
  );
}
