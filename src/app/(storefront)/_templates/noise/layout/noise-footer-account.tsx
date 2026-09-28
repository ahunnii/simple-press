"use client";

import Link from "next/link";

import type { Session } from "~/server/better-auth/config";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";

const SIGN_IN_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`;

type NoiseFooterAccountProps = {
  /** The layout's server-side session. It seeds `useHydratedSession`, so the
   *  right rows are in the SSR HTML and never flash. */
  initialSession?: Session | null;
  /** Signed-in rows, resolved server-side by the footer from the flag-gated
   *  `getAccountNavLinks`: "My account", plus "Orders" only while `orders`
   *  is on. */
  signedInLinks: { label: string; href: string }[];
};

/**
 * The account rows at the foot of the footer's Quick Links column (B10.3).
 * A client child of the async `NoiseFooter` so it can read the session; it
 * renders `<li>`s straight into the column's list with the column's own link
 * style. Signed out: "Sign in". Signed in: the rows the footer resolved. The
 * caller gates this on `customerAccounts`. Renders nothing while an unseeded
 * session is pending.
 */
export function NoiseFooterAccount({
  initialSession,
  signedInLinks,
}: NoiseFooterAccountProps) {
  const { data: session, isPending } = useHydratedSession(initialSession);

  if (isPending) return null;

  const links = session?.user
    ? signedInLinks
    : [{ label: "Sign in", href: SIGN_IN_HREF }];

  return (
    <>
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="vn-footer-link font-sans"
            style={{ fontSize: "13px" }}
          >
            {link.label}
          </Link>
        </li>
      ))}
    </>
  );
}
