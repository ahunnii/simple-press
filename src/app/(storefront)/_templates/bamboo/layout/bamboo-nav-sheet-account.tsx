"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";

import type { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { getAccountNavLinks } from "~/app/(storefront)/_components/nav";

/**
 * Quick-access account keys shown in this signed-in block — Orders,
 * Settings, Admin (B4.3/B4.4 decision, 2026-09-27). Kept as its own local
 * copy of `bamboo-header.tsx`'s `BAMBOO_QUICK_ACCOUNT_KEYS` (same keys)
 * rather than an import, to avoid a header ↔ mobile-nav ↔ sheet-account
 * import cycle.
 */
const BAMBOO_QUICK_ACCOUNT_KEYS = new Set(["orders", "settings", "admin"]);

const SIGN_OUT_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signOut}`;

type HydratedSession = ReturnType<typeof useHydratedSession>["data"];

type BambooNavSheetAccountProps = {
  /** Hydrated session from the header's `useHydratedSession` — the header
   *  owns it so the bar and the sheet can't disagree. Only rendered by the
   *  caller once `session?.user` is truthy. */
  session: HydratedSession;
  /** Storefront flag check (`useStorefrontFlags().isEnabled`). */
  isEnabled: (flag: string) => boolean;
  /** Closes the sheet — every link here navigates away. */
  onClose: () => void;
};

/**
 * Signed-in account block for bamboo's full-screen mobile takeover
 * (`bamboo-mobile-nav.tsx`), rendered in the sheet's pinned bottom area where
 * the signed-out Sign up / Log in pair otherwise sits (PF7). Deliberately
 * NOT `UserButton`: its Radix dropdown portals to `document.body`, outside
 * the sheet's own portal container and focus scope. Pattern mirrors
 * `pollen/layout/pollen-nav-overlay-account.tsx`'s signed-in block, restyled
 * to bamboo's forest/cream/gold-soft chrome — a real link to the
 * better-auth-ui sign-out view (not a bare `authClient.signOut()` call), the
 * same mechanism the desktop `UserButton` menu uses, so sign-out invalidates
 * the session server-side identically from both surfaces.
 *
 * The caller gates this on the `customerAccounts` flag and only mounts it
 * once the session has settled (no pending flash, B4.5).
 */
export function BambooNavSheetAccount({
  session,
  isEnabled,
  onClose,
}: BambooNavSheetAccountProps) {
  const user = session?.user;
  if (!user) return null;

  const includeAdmin =
    user.platformRole === "PLATFORM_ADMIN" || !!session?.session?.membershipId;

  const links = getAccountNavLinks({ isEnabled, includeAdmin }).filter(
    (link) => BAMBOO_QUICK_ACCOUNT_KEYS.has(link.key),
  );

  return (
    <div className="mb-6">
      <p className="mb-1 text-xs font-medium tracking-[0.18em] text-[var(--bam-cream)]/60 uppercase">
        Your account
      </p>
      <nav aria-label="Account">
        <ul className="flex flex-col">
          {links.map((link) => (
            <li key={link.key}>
              <Link
                href={link.href}
                onClick={onClose}
                className="flex min-h-11 items-center py-2 text-base text-[var(--bam-cream)]/90 transition-colors hover:text-[var(--bam-gold-soft)]"
              >
                {link.label}
              </Link>
            </li>
          ))}
          {/* Quiet sign-out row — the desktop header's `UserButton` menu is
              the equivalent above lg; this is the only sign-out reachable
              below lg (B4.4). */}
          <li>
            <Link
              href={SIGN_OUT_HREF}
              onClick={onClose}
              className="flex min-h-11 items-center gap-2 py-2 text-sm text-[var(--bam-cream)]/70 transition-colors hover:text-[var(--bam-gold-soft)]"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
