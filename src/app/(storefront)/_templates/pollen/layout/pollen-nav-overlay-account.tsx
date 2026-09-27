"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";

import type { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { getAccountNavLinks } from "~/app/(storefront)/_components/nav";

type HydratedSession = ReturnType<typeof useHydratedSession>["data"];

type PollenNavOverlayAccountProps = {
  /** Hydrated session from the header's `useHydratedSession` — the header
   *  owns it so the bar and the overlay can't disagree. */
  session: HydratedSession;
  isPending: boolean;
  /** Storefront flag check (`useStorefrontFlags().isEnabled`). */
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
 * Account block for pollen's dark full-screen mobile overlay (#1A1E1A).
 *
 * Deliberately NOT `UserButton`: its Radix dropdown portals to
 * `document.body` at z-50, underneath the z-60 overlay — Settings / Orders /
 * Sign out were unreachable — and it sat outside the overlay's focus trap.
 * Its `UserView` also paints the name in `text-foreground`, unreadable on
 * the dark surface. Everything here is a plain anchor inside the overlay
 * subtree, in light text. Sign-out navigates to the better-auth-ui sign-out
 * view, the same mechanism `UserButton` (and olive/umsc overlays) use.
 *
 * The caller gates this on the `customerAccounts` storefront flag.
 */
export function PollenNavOverlayAccount({
  session,
  isPending,
  isEnabled,
  onClose,
}: PollenNavOverlayAccountProps) {
  if (isPending) {
    return (
      <div
        className="h-11 w-48 animate-pulse rounded-full bg-white/10"
        aria-hidden="true"
      />
    );
  }

  const user = session?.user;

  if (!user) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* White on #1A1E1A = 16.87:1; border white/70 ≈ 8.8:1. */}
        <Link
          href={SIGN_IN_HREF}
          onClick={onClose}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/70 px-6 text-sm font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white/10"
        >
          Log in
        </Link>
        {/* #1A1E1A on #A8D081 = 9.65:1. */}
        <Link
          href={SIGN_UP_HREF}
          onClick={onClose}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#A8D081] px-6 text-sm font-semibold tracking-wide text-[#1A1E1A] uppercase transition-colors hover:bg-[#C2DDA6]"
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
    <div className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl border border-white/15 px-4 py-3">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar URLs come from arbitrary OAuth hosts not in next.config's image domains
          <img
            src={user.image}
            alt=""
            className="size-11 shrink-0 rounded-full object-cover ring-2 ring-[#A8D081]"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#A8D081] text-sm font-semibold text-[#1A1E1A]"
          >
            {initials}
          </span>
        )}
        <div className="grid min-w-0 text-left leading-tight">
          <span className="truncate text-base font-medium text-white">
            {primaryLabel}
          </span>
          {name ? (
            <span className="truncate text-sm text-white/70">{user.email}</span>
          ) : null}
        </div>
      </div>

      <nav aria-label="Account">
        <ul className="flex flex-col">
          {links.map((link) => (
            <li key={link.key}>
              <Link
                href={link.href}
                onClick={onClose}
                className="flex min-h-11 items-center rounded-lg px-4 text-base text-white/90 transition-colors hover:bg-white/10 hover:text-white"
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
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/70 px-6 text-sm font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white/10"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Sign out
      </Link>
    </div>
  );
}
