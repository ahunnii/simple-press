"use client";

import Link from "next/link";

import type { Session } from "~/server/better-auth/config";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";

const SIGN_IN_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`;

type DreamFooterAccountProps = {
  /** The layout's server-side session — seeds `useHydratedSession`, so the
   *  right links are in the SSR HTML and never flash. */
  initialSession?: Session | null;
  /** Signed-in links, resolved server-side by the footer from the flag-gated
   *  `getAccountNavLinks` ("My account", plus "Orders" only while `orders`
   *  is on). */
  signedInLinks: { label: string; href: string }[];
};

/**
 * The account entries at the end of the footer's quick-links column (B10.3).
 * A client child of the async `DreamFooter` so it can read the session;
 * renders plain `.dream-footer-link` anchors straight into the column, so they
 * read as the column's last links. Signed out: Sign in. Signed in: the links
 * the footer resolved. The caller gates this on `customerAccounts`. Renders
 * nothing while an unseeded session is pending (no signed-out flash).
 */
export function DreamFooterAccount({
  initialSession,
  signedInLinks,
}: DreamFooterAccountProps) {
  const { data: session, isPending } = useHydratedSession(initialSession);

  if (isPending) return null;

  const links = session?.user
    ? signedInLinks
    : [{ label: "Sign in", href: SIGN_IN_HREF }];

  return (
    <>
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="dream-footer-link">
          {link.label}
        </Link>
      ))}
    </>
  );
}
