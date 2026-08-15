"use client";

import { AccountSettingsCards } from "~/components/account/account-settings-cards";
import { PageTransition } from "~/components/page-animations";

import { SledgeAccountLayout } from "./sledge-account-layout";

export function SledgeAccountSettingsPage() {
  return (
    <PageTransition className="bg-white">
      <SledgeAccountLayout heading="Settings">
        <AccountSettingsCards />
      </SledgeAccountLayout>
    </PageTransition>
  );
}
