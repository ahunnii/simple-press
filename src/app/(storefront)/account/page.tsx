import { redirect } from "next/navigation";

import { AUTH_BASE_PATHS, SETTINGS_VIEW_PATHS } from "~/lib/auth-paths";

/**
 * `/account` has no view of its own — send it to account settings, the one
 * account page every store has. The parent layout has already enforced the
 * `customerAccounts` flag and a signed-in session by the time this runs.
 */
export default function AccountIndexPage() {
  redirect(`${AUTH_BASE_PATHS.settings}/${SETTINGS_VIEW_PATHS.account}`);
}
