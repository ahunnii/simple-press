"use client";

import { AccountSettingsCards } from "~/components/account/account-settings-cards";

import { DreamReveal } from "../shared/dream-reveal";
import { DreamAccountLayout } from "./dream-account-layout";

export function DreamAccountSettingsPage() {
  return (
    <DreamAccountLayout
      heading="Settings"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Settings" },
      ]}
    >
      <DreamReveal>
        <AccountSettingsCards />
      </DreamReveal>
    </DreamAccountLayout>
  );
}
