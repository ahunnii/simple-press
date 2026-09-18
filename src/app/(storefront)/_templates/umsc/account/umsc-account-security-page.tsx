"use client";

import { SecuritySettingsCards } from "~/components/account/security-settings-cards";

import { UmscAccountLayout } from "./umsc-account-layout";

export function UmscAccountSecurityPage() {
  return (
    <UmscAccountLayout
      heading="Security"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Security" },
      ]}
    >
      <SecuritySettingsCards />
    </UmscAccountLayout>
  );
}
