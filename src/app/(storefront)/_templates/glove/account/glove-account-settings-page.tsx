"use client";

import { AccountSettingsCards } from "~/components/account/account-settings-cards";

import { GloveAccountLayout } from "./glove-account-layout";

/**
 * Settings: prop-less by contract. Wraps better-auth-ui's
 * `AccountSettingsCards` verbatim; the `.glove-account` bridge on the layout
 * reskins its shadcn primitives.
 */
export function GloveAccountSettingsPage() {
  return (
    <GloveAccountLayout heading="Settings">
      <AccountSettingsCards />
    </GloveAccountLayout>
  );
}
