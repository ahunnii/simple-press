"use client";

import { AccountSettingsCards } from "~/components/account/account-settings-cards";

import { DarkTrendAccountLayout } from "./dark-trend-account-layout";

export function DarkTrendAccountSettingsPage() {
  return (
    <DarkTrendAccountLayout heading="Settings">
      <AccountSettingsCards />
    </DarkTrendAccountLayout>
  );
}
