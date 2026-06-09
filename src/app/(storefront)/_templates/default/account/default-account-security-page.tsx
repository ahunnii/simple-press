"use client";

import { SecuritySettingsCards } from "@daveyplate/better-auth-ui";

import { DefaultAccountLayout } from "./default-account-layout";

export function DefaultAccountSecurityPage() {
  return (
    <DefaultAccountLayout heading="Security">
      <SecuritySettingsCards />
    </DefaultAccountLayout>
  );
}
