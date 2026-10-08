"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";

import type { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { getAccountNavLinks } from "~/app/(storefront)/_components/nav";

import { gloveButtonClass } from "../shared/glove-button";

type HydratedSession = ReturnType<typeof useHydratedSession>["data"];

const SIGN_IN_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`;
const SIGN_UP_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signUp}`;
const SIGN_OUT_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signOut}`;

type GloveMobileAccountProps = {
  session: HydratedSession;
  isPending: boolean;
  isEnabled: (flag: string) => boolean;
  /** Label of the signed-out/primary account action (the header's account label). */
  label: string;
  /** Closes the drawer; every link here navigates away. */
  onClose: () => void;
};

/**
 * Account block inside the mobile drawer (B4.4). Plain anchors inside the
 * drawer subtree: UserButton's Radix portal would sit under the drawer and
 * outside its focus trap. The caller gates this on `customerAccounts`.
 */
export function GloveMobileAccount({
  session,
  isPending,
  isEnabled,
  label,
  onClose,
}: GloveMobileAccountProps) {
  if (isPending) {
    return (
      <div
        aria-hidden="true"
        className="h-12 w-full animate-pulse rounded-[var(--glove-radius-btn)] bg-[var(--glove-cloud)]"
      />
    );
  }

  const user = session?.user;

  if (!user) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={SIGN_IN_HREF}
          onClick={onClose}
          className={gloveButtonClass({ variant: "woo" })}
        >
          Sign in
        </Link>
        <Link
          href={SIGN_UP_HREF}
          onClick={onClose}
          className={gloveButtonClass({ variant: "wooOutline" })}
        >
          Sign up
        </Link>
      </div>
    );
  }

  const includeAdmin =
    user.platformRole === "PLATFORM_ADMIN" || !!session?.session?.membershipId;
  const links = getAccountNavLinks({ isEnabled, includeAdmin });
  const name = user.name?.trim() ?? "";

  return (
    <div className="flex flex-col gap-2">
      <p className="glove-display text-[13px] font-semibold tracking-wide text-[var(--glove-primary)] uppercase">
        {label}
      </p>
      <p className="truncate text-[13px] text-[var(--glove-muted)]">
        {name || user.email}
      </p>
      <nav aria-label="Account">
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {links.map((link) => (
            <li key={link.key}>
              <Link
                href={link.href}
                onClick={onClose}
                className="inline-flex min-h-11 items-center rounded-full border border-[var(--glove-line)] px-4 text-[14px] text-[var(--glove-ink)] transition-colors hover:border-[var(--glove-primary)] hover:text-[var(--glove-primary)]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Link
        href={SIGN_OUT_HREF}
        onClick={onClose}
        className="inline-flex min-h-11 items-center gap-2 self-start text-[14px] text-[var(--glove-text)] transition-colors hover:text-[var(--glove-primary)]"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Sign out
      </Link>
    </div>
  );
}
