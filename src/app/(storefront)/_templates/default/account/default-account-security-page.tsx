"use client";

import { SecuritySettingsCards } from "~/components/account/security-settings-cards";

import { DefaultAccountLayout } from "./default-account-layout";

export function DefaultAccountSecurityPage() {
  return (
    <DefaultAccountLayout heading="Security">
      <SecuritySettingsCards />
    </DefaultAccountLayout>
  );
}
