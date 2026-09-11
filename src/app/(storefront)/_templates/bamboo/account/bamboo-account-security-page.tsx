"use client";

import { SecuritySettingsCards } from "~/components/account/security-settings-cards";
import { PageTransition } from "~/components/page-animations";

import { BambooAccountLayout } from "./bamboo-account-layout";

export function BambooAccountSecurityPage() {
  return (
    <PageTransition>
      <BambooAccountLayout
        heading="Security"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Account", href: "/account/settings" },
          { label: "Security" },
        ]}
      >
        <SecuritySettingsCards />
      </BambooAccountLayout>
    </PageTransition>
  );
}
