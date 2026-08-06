"use client";

import { AccountSettingsCards } from "~/components/account/account-settings-cards";

import { DefaultAccountLayout } from "./default-account-layout";

export function DefaultAccountSettingsPage() {
  return (
    <DefaultAccountLayout heading="Settings">
      <AccountSettingsCards />
    </DefaultAccountLayout>
  );
}
