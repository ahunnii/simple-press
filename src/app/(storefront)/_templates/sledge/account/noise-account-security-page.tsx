"use client";

import { SecuritySettingsCards } from "@daveyplate/better-auth-ui";

import { NoiseAccountLayout } from "./noise-account-layout";

export function NoiseAccountSecurityPage() {
  return (
    <NoiseAccountLayout heading="Security">
      <SecuritySettingsCards />
    </NoiseAccountLayout>
  );
}
