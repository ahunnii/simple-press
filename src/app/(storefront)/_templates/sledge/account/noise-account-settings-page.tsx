"use client";

import { AccountSettingsCards } from "@daveyplate/better-auth-ui";

import { NoiseAccountLayout } from "./noise-account-layout";

export function NoiseAccountSettingsPage() {
  return (
    <NoiseAccountLayout heading="Settings">
      <AccountSettingsCards />
    </NoiseAccountLayout>
  );
}
