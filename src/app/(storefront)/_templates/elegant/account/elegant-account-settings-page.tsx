"use client";

import { AccountSettingsCards } from "~/components/account/account-settings-cards";

import { ElegantAccountLayout } from "./elegant-account-layout";

export function ElegantAccountSettingsPage() {
  return (
    <ElegantAccountLayout heading="Settings">
      <AccountSettingsCards />
    </ElegantAccountLayout>
  );
}
