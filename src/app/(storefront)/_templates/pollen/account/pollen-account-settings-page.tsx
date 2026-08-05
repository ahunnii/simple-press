"use client";

import { AccountSettingsCards } from "~/components/account/account-settings-cards";

import { PollenAccountLayout } from "./pollen-account-layout";

export function PollenAccountSettingsPage() {
  return (
    <PollenAccountLayout heading="Settings">
      <AccountSettingsCards />
    </PollenAccountLayout>
  );
}
