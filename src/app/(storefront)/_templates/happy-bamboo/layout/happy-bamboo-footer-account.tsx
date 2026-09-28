"use client";

import Link from "next/link";

import {
  AUTH_BASE_PATHS,
  AUTH_VIEW_PATHS,
  SETTINGS_VIEW_PATHS,
} from "~/lib/auth-paths";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";

const SIGN_IN_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`;
const ACCOUNT_HREF = `${AUTH_BASE_PATHS.settings}/${SETTINGS_VIEW_PATHS.account}`;
const ORDERS_HREF = `${AUTH_BASE_PATHS.settings}/orders`;

const linkClass =
  "text-muted text-sm transition-colors hover:text-[var(--hb-primary-on-dark)]";

type HappyBambooFooterAccountProps = {
  /** `getBusinessFlags()`'s `isEnabled("orders")`, resolved server-side by
   *  the footer — this client child never fetches flags itself. */
  ordersEnabled: boolean;
};

/**
 * Account entry at the end of the footer's Quick Links column (B10.3). A
 * client child of the async `HappyBambooFooter` server component, so it can
 * read the session without making the whole footer a client component —
 * mirrors `pollen-footer.tsx`'s own account column. The caller (the footer)
 * gates this on the `customerAccounts` flag.
 *
 * No SSR session seed (the footer has none to give it, same as pollen's):
 * renders these `<li>`s as list items of the caller's `<ul>` and nothing
 * while the session is pending, so a signed-in visitor never sees a
 * signed-out "Sign in" flash.
 */
export function HappyBambooFooterAccount({
  ordersEnabled,
}: HappyBambooFooterAccountProps) {
  const { data: session, isPending } = useHydratedSession();
  if (isPending) return null;

  if (!session?.user) {
    return (
      <li>
        <Link href={SIGN_IN_HREF} className={linkClass}>
          Sign in
        </Link>
      </li>
    );
  }

  return (
    <>
      <li>
        <Link href={ACCOUNT_HREF} className={linkClass}>
          My account
        </Link>
      </li>
      {ordersEnabled && (
        <li>
          <Link href={ORDERS_HREF} className={linkClass}>
            Orders
          </Link>
        </li>
      )}
    </>
  );
}
