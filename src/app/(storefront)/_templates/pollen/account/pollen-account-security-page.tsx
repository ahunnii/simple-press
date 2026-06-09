"use client";

import { SecuritySettingsCards } from "@daveyplate/better-auth-ui";

import { PollenAccountLayout } from "./pollen-account-layout";

export function PollenAccountSecurityPage() {
  return (
    <PollenAccountLayout heading="Security">
      <SecuritySettingsCards />
    </PollenAccountLayout>
  );
}
