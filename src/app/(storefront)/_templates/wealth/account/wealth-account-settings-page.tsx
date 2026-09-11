"use client";

import { AccountSettingsCards } from "~/components/account/account-settings-cards";

import { WealthReveal } from "../shared/wealth-reveal";
import { WealthAccountLayout } from "./wealth-account-layout";

export function WealthAccountSettingsPage() {
  return (
    <WealthAccountLayout
      heading="Settings"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Settings" },
      ]}
    >
      <WealthReveal>
        <AccountSettingsCards />
      </WealthReveal>
    </WealthAccountLayout>
  );
}
