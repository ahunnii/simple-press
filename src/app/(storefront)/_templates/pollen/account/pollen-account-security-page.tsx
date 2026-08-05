"use client";

import { SecuritySettingsCards } from "~/components/account/security-settings-cards";

import { PollenAccountLayout } from "./pollen-account-layout";

export function PollenAccountSecurityPage() {
  return (
    <PollenAccountLayout heading="Security">
      <SecuritySettingsCards />
    </PollenAccountLayout>
  );
}
