"use client";

import type { AccountPreferencesPageProps } from "../../types";
import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import { DreamReveal } from "../shared/dream-reveal";
import { DreamAccountLayout } from "./dream-account-layout";

export function DreamPreferencesPage({
  business,
  customer,
}: AccountPreferencesPageProps) {
  return (
    <DreamAccountLayout
      heading="Preferences"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Preferences" },
      ]}
    >
      <DreamReveal>
        <PreferencesContent business={business} customer={customer} />
      </DreamReveal>
    </DreamAccountLayout>
  );
}
