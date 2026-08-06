"use client";

import { SecuritySettingsCards } from "~/components/account/security-settings-cards";

import { DarkTrendAccountLayout } from "./dark-trend-account-layout";

export function DarkTrendAccountSecurityPage() {
  return (
    <DarkTrendAccountLayout heading="Security">
      <SecuritySettingsCards />
    </DarkTrendAccountLayout>
  );
}
