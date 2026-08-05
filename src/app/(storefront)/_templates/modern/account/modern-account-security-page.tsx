"use client";

import { SecuritySettingsCards } from "~/components/account/security-settings-cards";

import { ModernAccountLayout } from "./modern-account-layout";

export function ModernAccountSecurityPage() {
  return (
    <ModernAccountLayout heading="Security">
      <SecuritySettingsCards />
    </ModernAccountLayout>
  );
}
