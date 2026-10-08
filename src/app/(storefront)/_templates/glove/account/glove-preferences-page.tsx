"use client";

import type { AccountPreferencesPageProps } from "../../types";
import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import { GloveAccountLayout } from "./glove-account-layout";

/** Preferences: wraps the shared `PreferencesContent`, which owns the mutation. */
export function GlovePreferencesPage({
  business,
  customer,
}: AccountPreferencesPageProps) {
  return (
    <GloveAccountLayout heading="Preferences">
      <PreferencesContent business={business} customer={customer} />
    </GloveAccountLayout>
  );
}
