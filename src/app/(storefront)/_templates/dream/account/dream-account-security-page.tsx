"use client";

import { SecuritySettingsCards } from "~/components/account/security-settings-cards";

import { DreamReveal } from "../shared/dream-reveal";
import { DreamAccountLayout } from "./dream-account-layout";

export function DreamAccountSecurityPage() {
  return (
    <DreamAccountLayout
      heading="Security"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Security" },
      ]}
    >
      <DreamReveal>
        <SecuritySettingsCards />
      </DreamReveal>
    </DreamAccountLayout>
  );
}
