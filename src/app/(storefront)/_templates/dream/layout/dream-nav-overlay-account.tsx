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

type DreamNavOverlayAccountProps = {
  initialSession?: Session | null;
  accountsEnabled: boolean;
  ordersEnabled: boolean;
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
export function DreamNavOverlayAccount({
  initialSession,
  accountsEnabled,
  ordersEnabled,
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

  return (
    <div className="dream-nav-overlay-account">
      {/* UserView renders its own avatar — don't add a second one. */}
      <UserView className="dream-nav-overlay-account-user" />

      <ul className="dream-nav-overlay-account-list">
        {ordersEnabled ? (
          <li>
            <Link
              href="/account/orders"
              onClick={onClose}
              className="dream-nav-overlay-account-link"
            >
              <IconPackage className="h-4 w-4" aria-hidden="true" />
              Orders
            </Link>
          </li>
        ) : null}

        {showAdminLink ? (
          <li>
            <Link
              href="/admin"
              onClick={onClose}
              className="dream-nav-overlay-account-link"
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
            className="dream-nav-overlay-account-link"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            Account settings
          </Link>
        </li>

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
