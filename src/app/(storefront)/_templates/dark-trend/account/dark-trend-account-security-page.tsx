"use client";

import { SecuritySettingsCards } from "@daveyplate/better-auth-ui";

import { DarkTrendAccountLayout } from "./dark-trend-account-layout";

export function DarkTrendAccountSecurityPage() {
  return (
    <DarkTrendAccountLayout heading="Security">
      <SecuritySettingsCards />
    </DarkTrendAccountLayout>
  );
}
