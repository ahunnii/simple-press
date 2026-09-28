"use client";

import Link from "next/link";

import type { Session } from "~/server/better-auth/config";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";

const SIGN_IN_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`;

type PinkFooterAccountProps = {
  /** The layout's server-side session — seeds `useHydratedSession`, so the
   *  right link is already in the SSR HTML and never flashes. */
  initialSession?: Session | null;
  /** Signed-in links, resolved server-side by `PinkFooter` from the
   *  flag-gated `getAccountNavLinks` ("My account", plus "Orders" only
   *  while `orders` is on). */
  signedInLinks: { label: string; href: string }[];
  /** The footer's own resolved text color for the current tone (dark on
   *  most routes, light on `/about` and `/blog/[slug]`) — matches every
   *  other link in the Studio column it renders into. */
  fg: string;
};

/**
 * Account rows appended to the end of the Studio (quick-links) column
 * (B10.3, PF18). A client child of `PinkFooter` — itself already a client
 * component — kept separate so the session read and its markup are
 * self-contained, matching noise's/dream's/umsc's own `*FooterAccount`
 * components. Renders `<li>` rows straight into the Studio `<ul>`, with the
 * same link styling `FooterCol` uses for its own rows. Signed out: "Sign
 * in". Signed in: the links the footer resolved. The caller gates this on
 * `customerAccounts` and renders nothing while an unseeded session is
 * pending (no signed-out flash).
 */
export function PinkFooterAccount({
  initialSession,
  signedInLinks,
  fg,
}: PinkFooterAccountProps) {
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
            className="text-[15px] whitespace-nowrap transition-colors"
            style={{ color: fg }}
          >
            {link.label}
          </Link>
        </li>
      ))}
    </>
  );
}
