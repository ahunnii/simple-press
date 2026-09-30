"use client";

import Link from "next/link";

import {
  AUTH_BASE_PATHS,
  AUTH_VIEW_PATHS,
  SETTINGS_VIEW_PATHS,
} from "~/lib/auth-paths";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";

const SIGN_IN_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`;
const SIGN_UP_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signUp}`;
const ACCOUNT_HREF = `${AUTH_BASE_PATHS.settings}/${SETTINGS_VIEW_PATHS.account}`;
const ORDERS_HREF = `${AUTH_BASE_PATHS.settings}/orders`;

type ViiFooterAccountProps = {
  /** `getBusinessFlags()`'s `isEnabled("orders")`, resolved server-side by
   *  the footer — this client child never fetches flags itself. */
  ordersEnabled: boolean;
  /** Matches the footer's own link/heading styles so this column reads as
   *  part of the same set (`vii-footer.tsx`'s `columnLinkStyle`/
   *  `columnHeadingStyle`). */
  linkStyle: React.CSSProperties;
  headingStyle: React.CSSProperties;
};

/**
 * Account column for vii's footer (B10.3, PF10). A client child of the async
 * `ViiFooter` server component, so it can read the session without making
 * the whole footer a client component — mirrors `pollen-footer.tsx`'s own
 * account column and `bamboo-footer-account.tsx`'s split pattern. The
 * caller (the footer) gates this on the `customerAccounts` flag.
 *
 * No SSR session seed (the footer has none to give it): renders nothing
 * while the session is pending, so a signed-in visitor never sees a
 * signed-out "Sign in" flash (B4.5).
 */
export function ViiFooterAccount({
  ordersEnabled,
  linkStyle,
  headingStyle,
}: ViiFooterAccountProps) {
  const { data: session, isPending } = useHydratedSession();

  if (isPending) return null;

  const user = session?.user;

  return (
    <div>
      <h2 style={headingStyle}>Account</h2>
      <ul className="flex flex-col gap-3">
        {user ? (
          <>
            <li>
              <Link href={ACCOUNT_HREF} style={linkStyle} className="hover:opacity-100">
                My Account
              </Link>
            </li>
            {ordersEnabled && (
              <li>
                <Link href={ORDERS_HREF} style={linkStyle} className="hover:opacity-100">
                  Orders
                </Link>
              </li>
            )}
          </>
        ) : (
          <>
            <li>
              <Link href={SIGN_IN_HREF} style={linkStyle} className="hover:opacity-100">
                Sign In
              </Link>
            </li>
            <li>
              <Link href={SIGN_UP_HREF} style={linkStyle} className="hover:opacity-100">
                Create Account
              </Link>
            </li>
          </>
        )}
      </ul>
    </div>
  );
}
