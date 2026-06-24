"use client";

import type { AccountPreferencesPageProps } from "../../types";
import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import { ViiReveal } from "../shared/vii-reveal";
import { ViiAccountLayout } from "./vii-account-layout";

export function ViiPreferencesPage({
  business,
  customer,
}: AccountPreferencesPageProps) {
  return (
    <ViiAccountLayout
      heading="Preferences"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Preferences" },
      ]}
    >
      <ViiReveal>
        <PreferencesContent business={business} customer={customer} />
      </ViiReveal>
    </ViiAccountLayout>
  );
}
