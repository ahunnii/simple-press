"use client";

import { SecuritySettingsCards } from "@daveyplate/better-auth-ui";

import { PageTransition } from "~/components/page-animations";

import { SledgeAccountLayout } from "./sledge-account-layout";

export function SledgeAccountSecurityPage() {
  return (
    <PageTransition className="bg-white">
      <SledgeAccountLayout heading="Security">
        <SecuritySettingsCards />
      </SledgeAccountLayout>
    </PageTransition>
  );
}
