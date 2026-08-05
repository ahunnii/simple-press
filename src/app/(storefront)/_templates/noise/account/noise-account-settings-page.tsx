"use client";

import { AccountSettingsCards } from "~/components/account/account-settings-cards";

import { NoiseAccountLayout } from "./noise-account-layout";

export function NoiseAccountSettingsPage() {
  return (
    <NoiseAccountLayout heading="Settings">
      <AccountSettingsCards />
    </NoiseAccountLayout>
  );
}
