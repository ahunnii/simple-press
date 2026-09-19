"use client";

import Link from "next/link";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { LogOut, Settings } from "lucide-react";

import type { Session } from "~/server/better-auth/config";
import {
  AUTH_BASE_PATHS,
  AUTH_VIEW_PATHS,
  SETTINGS_VIEW_PATHS,
} from "~/lib/auth-paths";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { UserView } from "~/components/auth/user/user-view";

type OliveNavOverlayAccountProps = {
  initialSession?: Session | null;
  accountsEnabled: boolean;
  onClose: () => void;
};

/**
 * Account block for the mobile nav overlay.
 *
 * Deliberately NOT `UserButton`: its Radix dropdown portals to `document.body`
 * at z-50, which lands underneath the opaque z-60 overlay — the menu opened but
 * was invisible. Everything here is a plain anchor, so it is also reachable by
 * the overlay's own Tab focus trap (which only walks the dialog subtree).
 */
export function OliveNavOverlayAccount({
  initialSession,
  accountsEnabled,
  onClose,
}: OliveNavOverlayAccountProps) {
  const { data: session, isPending } = useHydratedSession(
    initialSession ?? null,
  );

  const showAdminLink =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  if (!accountsEnabled) return null;

  if (isPending) {
    return (
      <div className="olive-nav-overlay-account">
        <div className="olive-nav-overlay-account-skeleton animate-pulse" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="olive-nav-overlay-account">
        <ul className="olive-nav-overlay-account-list">
          <li>
            <Link
              href={`${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`}
              onClick={onClose}
              className="olive-nav-overlay-account-link"
            >
              Sign in
            </Link>
          </li>
          <li>
            <Link
              href={`${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signUp}`}
              onClick={onClose}
              className="olive-nav-overlay-account-link"
            >
              Create account
            </Link>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="olive-nav-overlay-account">
      {/* UserView renders its own avatar — don't add a second one. */}
      <UserView className="olive-nav-overlay-account-user" />

      <ul className="olive-nav-overlay-account-list">
        <li>
          <Link
            href="/account/orders"
            onClick={onClose}
            className="olive-nav-overlay-account-link"
          >
            <IconPackage className="h-4 w-4" aria-hidden="true" />
            Orders
          </Link>
        </li>

        {showAdminLink ? (
          <li>
            <Link
              href="/admin"
              onClick={onClose}
              className="olive-nav-overlay-account-link"
            >
              <IconLayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Admin
            </Link>
          </li>
        ) : null}

        <li>
          <Link
            href={`${AUTH_BASE_PATHS.settings}/${SETTINGS_VIEW_PATHS.account}`}
            onClick={onClose}
            className="olive-nav-overlay-account-link"
          >
            <Settings className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            Account settings
          </Link>
        </li>

        <li>
          <Link
            href={`${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signOut}`}
            onClick={onClose}
            className="olive-nav-overlay-account-link"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            Sign out
          </Link>
        </li>
      </ul>
    </div>
  );
}
