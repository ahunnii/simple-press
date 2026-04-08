"use client";

import { AccountSettingsCards } from "@daveyplate/better-auth-ui";

import { PageTransition } from "~/components/page-animations";

import { HappyBambooAccountLayout } from "./happy-bamboo-account-layout";

export function HappyBambooAccountSettingsPage() {
  return (
    <PageTransition>
      <HappyBambooAccountLayout
        heading="Settings"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Account", href: "/account/settings" },
          { label: "Settings" },
        ]}
      >
        <AccountSettingsCards />
      </HappyBambooAccountLayout>
    </PageTransition>
  );
}
