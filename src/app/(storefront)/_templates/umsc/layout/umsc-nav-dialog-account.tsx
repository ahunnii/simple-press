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
import { UserAvatar } from "~/components/auth/user/user-avatar";

type UmscNavDialogAccountProps = {
  initialSession?: Session | null;
  accountsEnabled: boolean;
  onClose: () => void;
};

/**
 * Account block for the mobile nav dialog.
 *
 * Deliberately NOT `UserButton`: its Radix dropdown portals to
 * `document.body` at z-50, which lands underneath the opaque z-60 dialog —
 * the menu opened but was invisible. Everything here is a plain anchor, so
 * it is also reachable by the dialog's own Tab focus trap (which only walks
 * the dialog subtree).
 */
export function UmscNavDialogAccount({
  initialSession,
  accountsEnabled,
  onClose,
}: UmscNavDialogAccountProps) {
  const { data: session, isPending } = useHydratedSession(
    initialSession ?? null,
  );

  const showAdminLink =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  if (!accountsEnabled) return null;

  if (isPending) {
    return (
      <div className="umsc-nav-dialog-account">
        <div className="umsc-nav-dialog-account-skeleton" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="umsc-nav-dialog-account">
        <ul className="umsc-nav-dialog-account-list">
          <li>
            <Link
              href={`${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`}
              onClick={onClose}
              className="umsc-nav-dialog-account-link umsc-sans"
            >
              Sign in
            </Link>
          </li>
          <li>
            <Link
              href={`${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signUp}`}
              onClick={onClose}
              className="umsc-nav-dialog-account-link umsc-sans"
            >
              Create account
            </Link>
          </li>
        </ul>
      </div>
    );
  }

  // `Session["user"]` doesn't carry `displayUsername` in its inferred type
  // (better-auth's username plugin adds it at runtime only) — same narrow
  // cast `UserView` uses. See `src/components/auth/user/user-view.tsx`.
  const user = session.user as typeof session.user & {
    displayUsername?: string | null;
  };
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string must also fall through to the next candidate, not just null/undefined
  const primaryLabel = user.displayUsername || user.name || user.email;
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string must also count as "not set"
  const showSubtitle = Boolean(user.displayUsername || user.name);

  return (
    <div className="umsc-nav-dialog-account">
      <div className="umsc-nav-dialog-account-user">
        <UserAvatar className="size-8 ring-1 ring-[var(--umsc-gold)] ring-offset-1 ring-offset-[var(--umsc-black)]" />
        <div className="grid min-w-0 leading-tight">
          <span className="umsc-sans truncate text-[14px] font-medium">
            {primaryLabel}
          </span>
          {showSubtitle ? (
            <span className="umsc-sans truncate text-[12px] opacity-70">
              {user.email}
            </span>
          ) : null}
        </div>
      </div>

      <ul className="umsc-nav-dialog-account-list">
        <li>
          <Link
            href="/account/orders"
            onClick={onClose}
            className="umsc-nav-dialog-account-link umsc-sans"
          >
            <IconPackage className="size-4" aria-hidden="true" />
            Orders
          </Link>
        </li>

        {showAdminLink ? (
          <li>
            <Link
              href="/admin"
              onClick={onClose}
              className="umsc-nav-dialog-account-link umsc-sans"
            >
              <IconLayoutDashboard className="size-4" aria-hidden="true" />
              Admin
            </Link>
          </li>
        ) : null}

        <li>
          <Link
            href={`${AUTH_BASE_PATHS.settings}/${SETTINGS_VIEW_PATHS.account}`}
            onClick={onClose}
            className="umsc-nav-dialog-account-link umsc-sans"
          >
            <Settings className="size-4" aria-hidden="true" />
            Account settings
          </Link>
        </li>

        <li>
          <Link
            href={`${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signOut}`}
            onClick={onClose}
            className="umsc-nav-dialog-account-link umsc-sans"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </Link>
        </li>
      </ul>
    </div>
  );
}
