"use client";

import { UserProfile } from "~/components/auth/settings/account/user-profile";
import { cn } from "~/lib/utils";

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
 * Renders: user profile (avatar + name + configured additional fields).
 *
 * Deliberately NOT the registry's `AccountSettings`: that also shows a
 * change-email card whenever email+password auth is on, but the server never
 * enables `user.changeEmail` (`~/server/better-auth/config.tsx`), so every
 * submit failed with CHANGE_EMAIL_DISABLED. Turning email changes on is a
 * product decision (one user row spans every store, and guest orders link by
 * email) — add the card back here when `user.changeEmail` is enabled.
 */
export function AccountSettingsCards({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-full flex-col gap-4 md:gap-6", className)}>
      <UserProfile />
    </div>
  );
}
