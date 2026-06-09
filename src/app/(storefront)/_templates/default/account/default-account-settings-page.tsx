"use client";

import { AccountSettingsCards } from "@daveyplate/better-auth-ui";

import { DefaultAccountLayout } from "./default-account-layout";

export function DefaultAccountSettingsPage() {
  return (
    <DefaultAccountLayout heading="Settings">
      <AccountSettingsCards />
    </DefaultAccountLayout>
  );
}
