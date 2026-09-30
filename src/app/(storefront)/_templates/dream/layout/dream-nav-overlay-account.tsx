"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { LogOut, Settings } from "lucide-react";

import type { Session } from "~/server/better-auth/config";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { UserView } from "~/components/auth/user/user-view";
import { getAccountNavLinks } from "~/app/(storefront)/_components/nav";

import { DREAM_QUICK_ACCOUNT_KEYS } from "./dream-nav";

type DreamNavOverlayAccountProps = {
  initialSession?: Session | null;
  accountsEnabled: boolean;
  /** Business flag check — gates the account links (Orders needs `orders`). */
  isEnabled: (flag: string) => boolean;
  onClose: () => void;
};

/** Leading icons, keyed by `getAccountNavLinks` key. */
const ACCOUNT_LINK_ICONS: Record<string, ReactNode> = {
  orders: <IconPackage className="h-4 w-4" aria-hidden="true" />,
  settings: <Settings className="h-4 w-4" aria-hidden="true" />,
  admin: <IconLayoutDashboard className="h-4 w-4" aria-hidden="true" />,
};

/**
 * Account block for the mobile nav overlay.
 *
 * Deliberately NOT `UserButton`: its Radix dropdown portals to `document.body`
 * at z-50, which lands underneath the opaque z-60 overlay — the menu opened but
 * was invisible. Everything here is a plain anchor, so it is also reachable by
 * the overlay's own Tab focus trap (which only walks the dialog subtree).
 *
 * The signed-in links are the quick-access subset (`DREAM_QUICK_ACCOUNT_KEYS`:
 * Orders, Settings, Admin) of the flag-gated `getAccountNavLinks` list — never
 * a hand-written list — followed by Sign out.
 */
export function DreamNavOverlayAccount({
  initialSession,
  accountsEnabled,
  isEnabled,
  onClose,
}: DreamNavOverlayAccountProps) {
  const { data: session, isPending } = useHydratedSession(
    initialSession ?? null,
  );

  const showAdminLink =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  if (!accountsEnabled) return null;

  if (isPending) {
    return (
      <div className="dream-nav-overlay-account">
        <div className="dream-nav-overlay-account-skeleton" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="dream-nav-overlay-account">
        <ul className="dream-nav-overlay-account-list">
          <li>
            <Link
              href={`${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`}
              onClick={onClose}
              className="dream-nav-overlay-account-link"
            >
              Sign in
            </Link>
          </li>
          <li>
            <Link
              href={`${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signUp}`}
              onClick={onClose}
              className="dream-nav-overlay-account-link"
            >
              Create account
            </Link>
          </li>
        </ul>
      </div>
    );
  }

  const accountLinks = getAccountNavLinks({
    isEnabled,
    includeAdmin: showAdminLink,
  }).filter((link) => DREAM_QUICK_ACCOUNT_KEYS.has(link.key));

  return (
    <div className="dream-nav-overlay-account">
      {/* UserView renders its own avatar — don't add a second one. */}
      <UserView className="dream-nav-overlay-account-user" />

      <ul className="dream-nav-overlay-account-list">
        {accountLinks.map((link) => (
          <li key={link.key}>
            <Link
              href={link.href}
              onClick={onClose}
              className="dream-nav-overlay-account-link"
            >
              {ACCOUNT_LINK_ICONS[link.key]}
              {link.label}
            </Link>
          </li>
        ))}

        <li>
          <Link
            href={`${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signOut}`}
            onClick={onClose}
            className="dream-nav-overlay-account-link"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </Link>
        </li>
      </ul>
    </div>
  );
}
