"use client";

import { AccountSettingsCards } from "@daveyplate/better-auth-ui";

import { ModernAccountLayout } from "./modern-account-layout";

export function ModernAccountSettingsPage() {
  return (
    <ModernAccountLayout heading="Settings">
      <AccountSettingsCards />
    </ModernAccountLayout>
  );
}
