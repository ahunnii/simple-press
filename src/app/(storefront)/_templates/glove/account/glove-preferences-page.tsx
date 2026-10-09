"use client";

import type { AccountPreferencesPageProps } from "../../types";
import { PreferencesContent } from "~/app/(storefront)/_components/account/address-components";

import { GloveAccountLayout } from "./glove-account-layout";

/**
 * Preferences: wraps the shared `PreferencesContent`, which owns the mutation.
 * Its section titles are h3s, so a visually hidden h2 keeps the outline
 * (band h1 > h2 > h3) free of skipped levels.
 */
export function GlovePreferencesPage({
  business,
  customer,
}: AccountPreferencesPageProps) {
  return (
    <GloveAccountLayout heading="Preferences">
      <h2 className="sr-only">Privacy and email settings</h2>
      <PreferencesContent business={business} customer={customer} />
    </GloveAccountLayout>
  );
}
