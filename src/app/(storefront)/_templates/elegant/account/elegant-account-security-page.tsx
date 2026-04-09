"use client";

import { SecuritySettingsCards } from "@daveyplate/better-auth-ui";

import { ElegantAccountLayout } from "./elegant-account-layout";

export function ElegantAccountSecurityPage() {
  return (
    <ElegantAccountLayout heading="Security">
      <SecuritySettingsCards />
    </ElegantAccountLayout>
  );
}
