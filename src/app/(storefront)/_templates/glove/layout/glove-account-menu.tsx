"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, CircleUser, LogOut } from "lucide-react";

import type { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { getAccountNavLinks } from "~/app/(storefront)/_components/nav";

import { GLOVE_FIELD_KEYS } from "./index";

type HydratedSession = ReturnType<typeof useHydratedSession>["data"];

const SIGN_IN_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`;
const SIGN_OUT_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signOut}`;

type GloveAccountMenuProps = {
  session: HydratedSession;
  isPending: boolean;
  isEnabled: (flag: string) => boolean;
  label: string;
};

/**
 * The bold purple MY ACCOUNT block. Signed out it links to sign-in; signed in
 * it opens a small disclosure with the flag-aware account links
 * (`getAccountNavLinks`) and sign-out. A custom disclosure rather than Radix,
 * so the panel stays inside the `.glove` scope. The caller gates this on the
 * `customerAccounts` flag.
 */
export function GloveAccountMenu({
  session,
  isPending,
  isEnabled,
  label,
}: GloveAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Close on route change (adjust state during render, per the React docs).
  const [openPath, setOpenPath] = useState(pathname);
  if (openPath !== pathname) {
    setOpenPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (wrapperRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  if (isPending) {
    // Same-size placeholder so the header doesn't shift.
    return (
      <span
        aria-hidden="true"
        className="block h-12 w-[150px] animate-pulse rounded-[var(--glove-radius-btn)] bg-[var(--glove-cloud)]"
      />
    );
  }

  const user = session?.user;
  const labelNode = (
    <span {...fieldAttr(GLOVE_FIELD_KEYS.accountLabel)}>{label}</span>
  );

  if (!user) {
    return (
      <Link href={SIGN_IN_HREF} className="glove-account-btn">
        <CircleUser className="size-6" aria-hidden="true" />
        {labelNode}
        <span className="sr-only"> (sign in)</span>
      </Link>
    );
  }

  const includeAdmin =
    user.platformRole === "PLATFORM_ADMIN" || !!session?.session?.membershipId;
  const links = getAccountNavLinks({ isEnabled, includeAdmin });

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="glove-account-panel"
        onClick={() => setOpen((o) => !o)}
        className="glove-account-btn"
      >
        <CircleUser className="size-6" aria-hidden="true" />
        {labelNode}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          id="glove-account-panel"
          className="glove-dropdown-panel absolute top-full right-0 z-30 mt-2 w-64 py-2"
        >
          <p className="truncate px-4 pt-1 pb-2 text-[13px] text-[var(--glove-muted)]">
            {user.name?.trim() ? user.name : user.email}
          </p>
          <ul className="m-0 list-none border-t border-[var(--glove-line)] p-0 pt-1">
            {links.map((link) => (
              <li key={link.key}>
                <Link
                  href={link.href}
                  className="glove-dropdown-link"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="mt-1 border-t border-[var(--glove-line)] pt-1">
              <Link
                href={SIGN_OUT_HREF}
                className="glove-dropdown-link inline-flex w-full items-center gap-2"
                onClick={() => setOpen(false)}
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
