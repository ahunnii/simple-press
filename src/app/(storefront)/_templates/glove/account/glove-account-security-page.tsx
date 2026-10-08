"use client";

import { SecuritySettingsCards } from "~/components/account/security-settings-cards";

import { GloveAccountLayout } from "./glove-account-layout";

/** Security: prop-less by contract. Wraps better-auth-ui's `SecuritySettingsCards` verbatim. */
export function GloveAccountSecurityPage() {
  return (
    <GloveAccountLayout heading="Security">
      <SecuritySettingsCards />
    </GloveAccountLayout>
  );
}
