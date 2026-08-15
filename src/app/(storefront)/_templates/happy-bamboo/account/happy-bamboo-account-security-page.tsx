"use client";

import { SecuritySettingsCards } from "~/components/account/security-settings-cards";
import { PageTransition } from "~/components/page-animations";

import { HappyBambooAccountLayout } from "./happy-bamboo-account-layout";

export function HappyBambooAccountSecurityPage() {
  return (
    <PageTransition>
      <HappyBambooAccountLayout
        heading="Security"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Account", href: "/account/settings" },
          { label: "Security" },
        ]}
      >
        <SecuritySettingsCards />
      </HappyBambooAccountLayout>
    </PageTransition>
  );
}
