"use client";

import { AccountSettingsCards } from "~/components/account/account-settings-cards";

import { UmscAccountLayout } from "./umsc-account-layout";

export function UmscAccountSettingsPage() {
  return (
    <UmscAccountLayout
      heading="Settings"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Settings" },
      ]}
    >
      <AccountSettingsCards />
    </UmscAccountLayout>
  );
}
