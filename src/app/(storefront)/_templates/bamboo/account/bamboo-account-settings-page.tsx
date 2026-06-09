"use client";

import { AccountSettingsCards } from "@daveyplate/better-auth-ui";

import { PageTransition } from "~/components/page-animations";

import { BambooAccountLayout } from "./bamboo-account-layout";

export function BambooAccountSettingsPage() {
  return (
    <PageTransition>
      <BambooAccountLayout heading="Settings">
        <AccountSettingsCards />
      </BambooAccountLayout>
    </PageTransition>
  );
}
