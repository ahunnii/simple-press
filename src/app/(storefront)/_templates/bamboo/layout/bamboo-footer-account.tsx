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

type BambooFooterAccountProps = {
  /** `getBusinessFlags()`'s `isEnabled("orders")`, resolved server-side by
   *  the footer — this client child never fetches flags itself. */
  ordersEnabled: boolean;
  /** Matches the footer's own `columnLinkClass` so this entry reads as part
   *  of the same Quick Links list. */
  linkClassName: string;
};

/**
 * Account entry at the end of the footer's Quick Links column (B10.3, PF10).
 * A client child of the async `BambooFooter` server component, so it can
 * read the session without making the whole footer a client component —
 * mirrors `happy-bamboo-footer-account.tsx` / `pollen-footer.tsx`'s own
 * account column. The caller (the footer) gates this on the
 * `customerAccounts` flag.
 *
 * No SSR session seed (the footer has none to give it): renders nothing
 * while the session is pending, so a signed-in visitor never sees a
 * signed-out "Sign in" flash (B4.5).
 */
export function BambooFooterAccount({
  ordersEnabled,
  linkClassName,
}: BambooFooterAccountProps) {
  const { data: session, isPending } = useHydratedSession();
  if (isPending) return null;

  if (!session?.user) {
    return (
      <Link href={SIGN_IN_HREF} className={linkClassName}>
        Sign in
      </Link>
    );
  }

  return (
    <>
      <Link href={ACCOUNT_HREF} className={linkClassName}>
        My account
      </Link>
      {ordersEnabled && (
        <Link href={ORDERS_HREF} className={linkClassName}>
          Orders
        </Link>
      )}
    </>
  );
}
