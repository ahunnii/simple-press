"use client";

import { SecuritySettingsCards } from "@daveyplate/better-auth-ui";

import { PageTransition } from "~/components/page-animations";

import { BambooAccountLayout } from "./bamboo-account-layout";

export function BambooAccountSecurityPage() {
  return (
    <PageTransition>
      <BambooAccountLayout heading="Security">
        <SecuritySettingsCards />
      </BambooAccountLayout>
    </PageTransition>
  );
}
