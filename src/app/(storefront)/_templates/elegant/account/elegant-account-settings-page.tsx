"use client";

import { AccountSettingsCards } from "@daveyplate/better-auth-ui";

import { ElegantAccountLayout } from "./elegant-account-layout";

export function ElegantAccountSettingsPage() {
  return (
    <ElegantAccountLayout heading="Settings">
      <AccountSettingsCards />
    </ElegantAccountLayout>
  );
}
