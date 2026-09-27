"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";

import type { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { getAccountNavLinks } from "~/app/(storefront)/_components/nav";

type HydratedSession = ReturnType<typeof useHydratedSession>["data"];

type WealthNavOverlayAccountProps = {
  /** Hydrated session from the overlay's `useHydratedSession`. */
  session: HydratedSession;
  isPending: boolean;
  /** Header's flag check (`useFeatureFlags(...).isEnabled`). */
  isEnabled: (flag: string) => boolean;
  /** Closes the overlay — every link here navigates away. */
  onClose: () => void;
};

const SIGN_IN_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`;
const SIGN_UP_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signUp}`;
const SIGN_OUT_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signOut}`;

/** Up to two initials from the display name, else the email's first two. */
function initialsFor(name: string, email: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

/**
 * Account block for wealth's full-screen white nav overlay
 * (`--wealth-paper`). The hamburger overlay is wealth's only nav at every
 * width, so this is the account menu on desktop too.
 *
 * Deliberately NOT `UserButton`: its Radix dropdown portals to
 * `document.body` at z-50, underneath the z-60 overlay — Settings / Orders /
 * Sign out were unreachable — and it sat outside the overlay's focus trap.
 * Everything here is a plain anchor inside the overlay subtree. Sign-out
 * navigates to the better-auth-ui sign-out view, the same mechanism
 * `UserButton` (and the olive/umsc/dream/pollen overlays) use.
 *
 * Contrast on #fff: ink #333 = 12.6:1, primary #376d39 = 6.2:1,
 * muted #6b6b6b = 5.3:1, btn-ink #24422b on accent #9bc5ad ≈ 5.8:1.
 *
 * The caller gates this on the `customerAccounts` flag.
 */
export function WealthNavOverlayAccount({
  session,
  isPending,
  isEnabled,
  onClose,
}: WealthNavOverlayAccountProps) {
  if (isPending) {
    return (
      <div
        className="h-11 w-48 animate-pulse rounded-full"
        style={{ background: "var(--wealth-surface)" }}
        aria-hidden="true"
      />
    );
  }

  const user = session?.user;

  if (!user) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href={SIGN_IN_HREF}
          onClick={onClose}
          className="wealth-btn-mono wealth-btn-ledge wealth-btn-ledge--outline"
        >
          Log in
        </Link>
        <Link
          href={SIGN_UP_HREF}
          onClick={onClose}
          className="wealth-btn-mono wealth-btn-ledge wealth-btn-ledge--accent"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const includeAdmin =
    user.platformRole === "PLATFORM_ADMIN" || !!session?.session?.membershipId;
  const links = getAccountNavLinks({ isEnabled, includeAdmin });

  // `name` can be blank (email-only sign-ups) — fall back to the email as the
  // primary line and drop the duplicate subtitle.
  const name = user.name?.trim() ?? "";
  const primaryLabel = name || user.email;
  const initials = initialsFor(name, user.email);

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <div className="flex max-w-full items-center gap-3">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar URLs come from arbitrary OAuth hosts not in next.config's image domains
          <img
            src={user.image}
            alt=""
            className="size-10 shrink-0 rounded-full object-cover"
            style={{ boxShadow: "0 0 0 2px var(--wealth-accent)" }}
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
            style={{
              background: "var(--wealth-primary)",
              color: "var(--wealth-paper)",
              fontFamily: "var(--font-wealth-body)",
            }}
          >
            {initials}
          </span>
        )}
        <div
          className="grid min-w-0 text-left leading-tight"
          style={{ fontFamily: "var(--font-wealth-body)" }}
        >
          <span
            className="truncate text-base font-medium"
            style={{ color: "var(--wealth-ink)" }}
          >
            {primaryLabel}
          </span>
          {name ? (
            <span
              className="truncate text-sm"
              style={{ color: "var(--wealth-muted)" }}
            >
              {user.email}
            </span>
          ) : null}
        </div>
      </div>

      <nav aria-label="Account" className="w-full">
        <ul className="m-0 flex list-none flex-wrap justify-center gap-x-1 p-0">
          {links.map((link) => (
            <li key={link.key}>
              <Link
                href={link.href}
                onClick={onClose}
                className="flex min-h-11 items-center px-3 text-[15px] underline-offset-4 transition-colors hover:underline"
                style={{
                  color: "var(--wealth-primary)",
                  fontFamily: "var(--font-wealth-body)",
                }}
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
        className="wealth-btn-mono wealth-btn-ledge wealth-btn-ledge--outline"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Sign out
      </Link>
    </div>
  );
}
