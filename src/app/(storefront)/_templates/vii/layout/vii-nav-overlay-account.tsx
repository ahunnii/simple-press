"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";

import type { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { getAccountNavLinks } from "~/app/(storefront)/_components/nav";

/**
 * Account links shown in vii's full-screen mobile menu (B4.4). Orders +
 * Settings — the desktop avatar menu drops Settings because `UserButton`
 * renders its own built-in Settings item; this overlay has no such
 * built-in, so it keeps its own copy. The full list (address book,
 * subscriptions, invoices, rewards, security, preferences) lives one tap
 * away via Settings, in the account sidebar.
 */
export const VII_OVERLAY_ACCOUNT_KEYS = new Set(["orders", "settings"]);

type HydratedSession = ReturnType<typeof useHydratedSession>["data"];

type ViiNavOverlayAccountProps = {
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

const pillButtonBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "14px",
  fontFamily: "var(--font-sans)",
  fontSize: "12px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  fontWeight: 500,
  textDecoration: "none",
  borderRadius: "var(--radius)",
  whiteSpace: "nowrap",
};

const outlineButtonStyle: React.CSSProperties = {
  ...pillButtonBase,
  background: "transparent",
  border: "1px solid color-mix(in srgb, var(--vii-navy) 20%, transparent)",
  color: "var(--vii-navy)",
};

const filledButtonStyle: React.CSSProperties = {
  ...pillButtonBase,
  background: "var(--vii-copper-deep)",
  color: "var(--vii-paper)",
  border: "none",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "11px",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: "var(--vii-ink-soft)",
};

const signOutStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  fontFamily: "var(--font-sans)",
  fontSize: "12px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--vii-ink-soft)",
  textDecoration: "none",
};

const rowLinkStyle: React.CSSProperties = {
  display: "block",
  padding: "12px 0",
  fontFamily: "var(--font-sans)",
  fontSize: "13px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 400,
  color: "var(--vii-navy)",
  textDecoration: "none",
};

/**
 * Account block for vii's full-screen mobile menu (B4.4, PF6).
 *
 * Deliberately NOT `UserButton`: its Radix dropdown portals to
 * `document.body`, underneath this overlay's stacking context and outside
 * its focus trap — see `pollen-nav-overlay-account.tsx`'s doc comment for
 * the same reasoning. Everything here is a plain anchor inside the overlay
 * subtree. Sign-out navigates to the better-auth-ui sign-out view, the same
 * mechanism the desktop `UserButton` uses.
 *
 * The caller gates this on the `customerAccounts` storefront flag.
 */
export function ViiNavOverlayAccount({
  session,
  isPending,
  isEnabled,
  onClose,
}: ViiNavOverlayAccountProps) {
  if (isPending) {
    return (
      <div
        aria-hidden="true"
        className="animate-pulse"
        style={{
          height: 44,
          width: "100%",
          borderRadius: "var(--radius)",
          background: "color-mix(in srgb, var(--vii-navy) 8%, transparent)",
        }}
      />
    );
  }

  const user = session?.user;

  if (!user) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Link href={SIGN_IN_HREF} onClick={onClose} style={outlineButtonStyle}>
          Sign In
        </Link>
        <Link href={SIGN_UP_HREF} onClick={onClose} style={filledButtonStyle}>
          Create Account
        </Link>
      </div>
    );
  }

  const includeAdmin =
    user.platformRole === "PLATFORM_ADMIN" || !!session?.session?.membershipId;
  const links = getAccountNavLinks({ isEnabled, includeAdmin }).filter(
    (link) => VII_OVERLAY_ACCOUNT_KEYS.has(link.key),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <span style={labelStyle}>Your Account</span>
        <Link href={SIGN_OUT_HREF} onClick={onClose} style={signOutStyle}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign Out
        </Link>
      </div>

      <nav aria-label="Account">
        <ul className="flex flex-col">
          {links.map((link) => (
            <li key={link.key}>
              <Link href={link.href} onClick={onClose} style={rowLinkStyle}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
