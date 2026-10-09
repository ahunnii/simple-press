"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";

import type { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { getAccountNavLinks } from "~/app/(storefront)/_components/nav";
import { cn } from "~/lib/utils";

import { gloveButtonClass } from "../shared/glove-button";
import { sentenceCase } from "../shared/glove-sentence-case";

type HydratedSession = ReturnType<typeof useHydratedSession>["data"];

const SIGN_IN_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`;
const SIGN_UP_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signUp}`;
const SIGN_OUT_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signOut}`;
const PANEL_ID = "glove-mobile-account-panel";

/** Same trigger row as the drawer's top-level nav rows (glove-mobile-nav.tsx). */
const triggerClass =
  "glove-display flex min-h-12 w-full items-center justify-between border-b border-[var(--glove-line)] py-2 text-left text-[15px] font-medium text-[var(--glove-nav)] transition-colors hover:text-[var(--glove-primary)]";

/** Same sublist and child-row classes as the nav group accordion in glove-mobile-nav.tsx. */
const panelClass =
  "m-0 list-none border-b border-[var(--glove-line)] bg-[var(--glove-mist)] p-0";
const rowClass =
  "flex min-h-11 items-center gap-2 py-2 pl-6 text-[14px] text-[var(--glove-nav)] transition-colors hover:text-[var(--glove-primary)]";

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
 * Account block inside the mobile drawer (B4.4). Signed in, it is an accordion
 * row styled like the drawer's nav rows: the label plus name/email, expanding
 * to the account links and Sign out. It starts open on /account routes. Plain
 * anchors inside the drawer subtree: UserButton's Radix portal would sit under
 * the drawer and outside its focus trap. The caller gates this on `customerAccounts`.
 */
export function GloveMobileAccount({
  session,
  isPending,
  isEnabled,
  label,
  onClose,
}: GloveMobileAccountProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(
    () => pathname?.startsWith("/account") ?? false,
  );

  if (isPending) {
    return (
      <div
        aria-hidden="true"
        className="h-12 w-full animate-pulse rounded-[var(--glove-radius-btn)] bg-[var(--glove-mist)]"
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
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={PANEL_ID}
        onClick={() => setExpanded((e) => !e)}
        className={triggerClass}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span>{sentenceCase(label)}</span>
          <span className="truncate text-[13px] font-normal text-[var(--glove-muted)]">
            {name || user.email}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded ? (
        <div id={PANEL_ID} className={panelClass}>
          <nav aria-label="Account">
            <ul className="m-0 flex list-none flex-col p-0">
              {links.map((link) => (
                <li key={link.key}>
                  <Link href={link.href} onClick={onClose} className={rowClass}>
                    {sentenceCase(link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link href={SIGN_OUT_HREF} onClick={onClose} className={rowClass}>
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </Link>
        </div>
      ) : null}
    </div>
  );
}
