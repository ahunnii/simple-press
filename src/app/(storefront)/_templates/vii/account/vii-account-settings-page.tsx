"use client";

import { AccountSettingsCards } from "@daveyplate/better-auth-ui";

import { ViiReveal } from "../shared/vii-reveal";

import { ViiAccountLayout } from "./vii-account-layout";

export function ViiAccountSettingsPage() {
  return (
    <ViiAccountLayout
      heading="Settings"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Settings" },
      ]}
    >
      <ViiReveal>
        <AccountSettingsCards />
      </ViiReveal>
    </ViiAccountLayout>
  );
}
