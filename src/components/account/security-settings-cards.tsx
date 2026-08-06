"use client";

import { SecuritySettings } from "~/components/auth/settings/security/security-settings";

/**
 * Security settings cards, as consumed by every template's account page.
 *
 * See the note in `./account-settings-cards.tsx` — this exists to keep the
 * vendored registry components one import away from 22 template files.
 *
 * Renders: change password, active sessions, and any plugin-contributed
 * security cards. The linked-accounts card only appears when `socialProviders`
 * is configured on `<AuthProvider>`, which it currently is not — matching the
 * behaviour before the migration.
 */
export function SecuritySettingsCards({ className }: { className?: string }) {
  return <SecuritySettings className={className} />;
}
