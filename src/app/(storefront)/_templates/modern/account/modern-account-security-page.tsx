"use client";

import { SecuritySettingsCards } from "@daveyplate/better-auth-ui";

import { ModernAccountLayout } from "./modern-account-layout";

export function ModernAccountSecurityPage() {
  return (
    <ModernAccountLayout heading="Security">
      <SecuritySettingsCards />
    </ModernAccountLayout>
  );
}
