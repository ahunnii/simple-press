"use client";

import { SecuritySettingsCards } from "~/components/account/security-settings-cards";

import { PinkAccountLayout } from "./pink-account-layout";

export function PinkAccountSecurityPage() {
  return (
    <PinkAccountLayout
      title="Security"
      description="Manage your password and sign-in methods."
    >
      <SecuritySettingsCards />
    </PinkAccountLayout>
  );
}
