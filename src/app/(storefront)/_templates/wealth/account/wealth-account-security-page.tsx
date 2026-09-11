"use client";

import { SecuritySettingsCards } from "~/components/account/security-settings-cards";

import { WealthReveal } from "../shared/wealth-reveal";
import { WealthAccountLayout } from "./wealth-account-layout";

export function WealthAccountSecurityPage() {
  return (
    <WealthAccountLayout
      heading="Security"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Security" },
      ]}
    >
      <WealthReveal>
        <SecuritySettingsCards />
      </WealthReveal>
    </WealthAccountLayout>
  );
}
