"use client";

import Link from "next/link";

import type { Session } from "~/server/better-auth/config";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";

const SIGN_IN_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`;
const SIGN_UP_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signUp}`;

type OliveFooterAccountProps = {
  /** The layout's server-side session — seeds `useHydratedSession`, so the
   *  right links are in the SSR HTML and never flash. */
  initialSession?: Session | null;
  /** Signed-in links, resolved server-side by the footer from the flag-gated
   *  `getAccountNavLinks` ("My account", plus "Orders" only while `orders`
   *  is on). */
  signedInLinks: { label: string; href: string }[];
};

/**
 * The account rows at the foot of the footer's About column (B10.3). A client
 * child of the async `OliveFooter` so it can read the session; renders `<li>`s
 * straight into the column's list. Signed out: Sign in + Create account.
 * Signed in: the links the footer resolved. The caller gates this on
 * `customerAccounts`. Renders nothing while an unseeded session is pending.
 */
export function OliveFooterAccount({
  initialSession,
  signedInLinks,
}: OliveFooterAccountProps) {
  const { data: session, isPending } = useHydratedSession(initialSession);

  if (isPending) return null;

  const links = session?.user
    ? signedInLinks
    : [
        { label: "Sign in", href: SIGN_IN_HREF },
        { label: "Create account", href: SIGN_UP_HREF },
      ];

  return (
    <>
      {links.map((link) => (
        <li key={link.href}>
          <Link href={link.href} className="olive-footer-link">
            {link.label}
          </Link>
        </li>
      ))}
    </>
  );
}
