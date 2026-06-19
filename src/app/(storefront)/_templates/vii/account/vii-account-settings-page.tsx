"use client";

import { AccountSettingsCards } from "@daveyplate/better-auth-ui";

import { PageTransition } from "~/components/page-animations";

import { ViiAccountLayout } from "./vii-account-layout";

export function ViiAccountSettingsPage() {
  return (
    <PageTransition>
      <ViiAccountLayout
        heading="Settings"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Account", href: "/account/settings" },
          { label: "Settings" },
        ]}
      >
        <AccountSettingsCards />
      </ViiAccountLayout>
    </PageTransition>
  );
}
