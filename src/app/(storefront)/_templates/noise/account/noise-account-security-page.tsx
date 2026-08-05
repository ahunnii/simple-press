"use client";

import { SecuritySettingsCards } from "~/components/account/security-settings-cards";

import { NoiseAccountLayout } from "./noise-account-layout";

export function NoiseAccountSecurityPage() {
  return (
    <NoiseAccountLayout heading="Security">
      <SecuritySettingsCards />
    </NoiseAccountLayout>
  );
}
