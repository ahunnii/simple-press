"use client";

import { SecuritySettingsCards } from "@daveyplate/better-auth-ui";

import { ViiReveal } from "../shared/vii-reveal";
import { ViiAccountLayout } from "./vii-account-layout";

export function ViiAccountSecurityPage() {
  return (
    <ViiAccountLayout
      heading="Security"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Security" },
      ]}
    >
      <ViiReveal>
        <SecuritySettingsCards />
      </ViiReveal>
    </ViiAccountLayout>
  );
}
