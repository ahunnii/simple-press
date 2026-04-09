"use client";

import { AccountSettingsCards } from "@daveyplate/better-auth-ui";

import { DarkTrendAccountLayout } from "./dark-trend-account-layout";

export function DarkTrendAccountSettingsPage() {
  return (
    <DarkTrendAccountLayout heading="Settings">
      <AccountSettingsCards />
    </DarkTrendAccountLayout>
  );
}
