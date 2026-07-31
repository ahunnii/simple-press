"use client";

import { SecuritySettingsCards } from "@daveyplate/better-auth-ui";

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
