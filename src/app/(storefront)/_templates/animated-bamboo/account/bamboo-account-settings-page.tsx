"use client";

import { AccountSettingsCards } from "~/components/account/account-settings-cards";

import { BambooAccountLayout } from "./bamboo-account-layout";

/**
 * Thin wrapper around the vendored better-auth account cards. Their colour
 * comes from the `.bamboo` Layer B shadcn bridge in globals.css (`--card`,
 * `--primary`, `--border`, `--muted-foreground`, `--ring`), so they render warm
 * without being forked — the only local styling is the stacking gap.
 */
export function BambooAccountSettingsPage() {
  return (
    <BambooAccountLayout heading="Settings">
      <div className="flex flex-col gap-6">
        <AccountSettingsCards />
      </div>
    </BambooAccountLayout>
  );
}
