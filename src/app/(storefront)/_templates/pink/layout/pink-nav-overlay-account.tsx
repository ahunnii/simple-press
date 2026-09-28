"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { LogOut, Settings, User } from "lucide-react";

import type { Session } from "~/server/better-auth/config";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { getAccountNavLinks } from "~/app/(storefront)/_components/nav";

import { PINK_QUICK_ACCOUNT_KEYS } from "./pink-nav";

const SIGN_IN_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`;
/** Same better-auth-ui sign-out view the desktop avatar menu navigates to. */
const SIGN_OUT_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signOut}`;

/** Leading icons, keyed by `getAccountNavLinks` key. */
const ACCOUNT_LINK_ICONS: Record<string, ReactNode> = {
  orders: <IconPackage className="h-4 w-4" aria-hidden="true" />,
  settings: <Settings className="h-4 w-4" aria-hidden="true" />,
  admin: <IconLayoutDashboard className="h-4 w-4" aria-hidden="true" />,
};

type PinkNavOverlayAccountProps = {
  initialSession?: Session | null;
  /** Storefront flag check — gates the whole block (`customerAccounts`) and
   *  the account links (Orders needs `orders`). */
  isEnabled: (flag: string) => boolean;
  onClose: () => void;
};

/**
 * Account block for the mobile menu overlay (B4.4), in the menu's dark
 * bottom stack.
 *
 * Deliberately NOT the desktop avatar menu: its Radix dropdown portals to
 * `document.body` at z-50, underneath the z-70 overlay and outside its focus
 * trap. Everything here is a plain anchor the overlay's own Tab trap reaches.
 *
 * - Signed out: the full-width "Sign in" ghost button the menu always had.
 * - Signed in: the quick-access subset (`PINK_QUICK_ACCOUNT_KEYS`: Orders,
 *   Settings, Admin) of the flag-gated `getAccountNavLinks` list — never a
 *   hand-written list — then Sign out, as one compact row of links so the
 *   stack doesn't crowd the nav above it.
 * - Pending (unseeded session only): a placeholder the size of the Sign in
 *   button, so the stack doesn't jump when the session lands.
 */
export function PinkNavOverlayAccount({
  initialSession,
  isEnabled,
  onClose,
}: PinkNavOverlayAccountProps) {
  const pathname = usePathname();
  const { data: session, isPending } = useHydratedSession(initialSession);

  if (!isEnabled("customerAccounts")) return null;

  if (isPending) {
    return (
      <span
        aria-hidden="true"
        className="pink-btn w-full py-3.5"
        style={{ background: "var(--pink-ink-panel)" }}
      >
        &nbsp;
      </span>
    );
  }

  if (!session?.user) {
    return (
      <Link
        href={SIGN_IN_HREF}
        onClick={onClose}
        className="pink-btn pink-btn-ghost w-full justify-center gap-2 py-3.5"
      >
        <User className="h-4 w-4" aria-hidden="true" />
        Sign in
      </Link>
    );
  }

  const showAdminLink =
    session.user.platformRole === "PLATFORM_ADMIN" ||
    !!session.session?.membershipId;

  const accountLinks = getAccountNavLinks({
    isEnabled,
    includeAdmin: showAdminLink,
  }).filter((link) => PINK_QUICK_ACCOUNT_KEYS.has(link.key));

  return (
    <nav aria-label="Account" className="flex flex-col gap-1">
      <p className="pink-label pink-label-dark">Your account</p>
      <ul className="flex flex-wrap items-center gap-x-6">
        {accountLinks.map((link) => (
          <li key={link.key}>
            <Link
              href={link.href}
              onClick={onClose}
              aria-current={pathname === link.href ? "page" : undefined}
              // `min-h-11`: a 44px touch target around the 15px nav type.
              className="pink-nav-link inline-flex min-h-11 items-center gap-2"
            >
              {ACCOUNT_LINK_ICONS[link.key]}
              {link.label}
            </Link>
          </li>
        ))}
        <li>
          <Link
            href={SIGN_OUT_HREF}
            onClick={onClose}
            className="pink-nav-link inline-flex min-h-11 items-center gap-2"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </Link>
        </li>
      </ul>
    </nav>
  );
}
