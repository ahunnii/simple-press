"use client";

import { AccountSettingsCards } from "~/components/account/account-settings-cards";

import { ModernAccountLayout } from "./modern-account-layout";

export function ModernAccountSettingsPage() {
  return (
    <ModernAccountLayout heading="Settings">
      <AccountSettingsCards />
    </ModernAccountLayout>
  );
}
