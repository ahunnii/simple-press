"use client";

import type { AccountPreferencesPageProps } from "../../types";
import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import { OliveReveal } from "../shared";
import { OliveAccountLayout } from "./olive-account-layout";

/** OlivePreferencesPage — wraps the shared `PreferencesContent`; the mutation lives there. */
export function OlivePreferencesPage({
  business,
  customer,
}: AccountPreferencesPageProps) {
  return (
    <OliveAccountLayout
      heading="Preferences"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Preferences" },
      ]}
    >
      <OliveReveal>
        <PreferencesContent business={business} customer={customer} />
      </OliveReveal>
    </OliveAccountLayout>
  );
}
