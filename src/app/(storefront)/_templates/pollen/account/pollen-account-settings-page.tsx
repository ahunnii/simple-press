"use client";

import { AccountSettingsCards } from "@daveyplate/better-auth-ui";

import { PollenAccountLayout } from "./pollen-account-layout";

export function PollenAccountSettingsPage() {
  return (
    <PollenAccountLayout heading="Settings">
      <AccountSettingsCards />
    </PollenAccountLayout>
  );
}
