"use client";

import { AccountSettings } from "~/components/auth/settings/account/account-settings";

/**
 * Account settings cards, as consumed by every template's account page.
 *
 * This is an insulation layer, not a component. All 11 templates import from
 * here rather than reaching into `~/components/auth/settings/**` directly, so
 * that re-fetching those files from the Better Auth UI shadcn registry (which
 * overwrites them wholesale) can never require touching 22 template files.
 *
 * It also preserves the name the templates already used when this was
 * `AccountSettingsCards` from `@daveyplate/better-auth-ui`, which kept that
 * migration to a one-line import swap per file.
 *
 * Renders: user profile (avatar + name + configured additional fields) and the
 * change-email card.
 */
export function AccountSettingsCards({ className }: { className?: string }) {
  return <AccountSettings className={className} />;
}
