"use client";

import { SecuritySettingsCards } from "~/components/account/security-settings-cards";

import { ElegantAccountLayout } from "./elegant-account-layout";

export function ElegantAccountSecurityPage() {
  return (
    <ElegantAccountLayout heading="Security">
      <SecuritySettingsCards />
    </ElegantAccountLayout>
  );
}
