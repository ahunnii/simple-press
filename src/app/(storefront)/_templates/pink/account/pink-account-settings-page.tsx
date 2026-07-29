"use client";

import { AccountSettingsCards } from "@daveyplate/better-auth-ui";

import { PinkAccountLayout } from "./pink-account-layout";

export function PinkAccountSettingsPage() {
  return (
    <PinkAccountLayout
      title="Settings"
      description="Update your name, email and other profile details."
    >
      <AccountSettingsCards />
    </PinkAccountLayout>
  );
}
