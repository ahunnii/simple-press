"use client";

import { SecuritySettingsCards } from "~/components/account/security-settings-cards";
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
