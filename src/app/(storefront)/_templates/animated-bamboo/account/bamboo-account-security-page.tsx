"use client";

import { SecuritySettingsCards } from "~/components/account/security-settings-cards";

import { BambooAccountLayout } from "./bamboo-account-layout";

/** See `bamboo-account-settings-page.tsx` — same bridge-token contract. */
export function BambooAccountSecurityPage() {
  return (
    <BambooAccountLayout heading="Security">
      <div className="flex flex-col gap-6">
        <SecuritySettingsCards />
      </div>
    </BambooAccountLayout>
  );
}
