"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { X } from "lucide-react";

import type { Session } from "~/server/better-auth/config";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { UserButton } from "~/components/auth/user/user-button";

export type DreamNavItem = { label: string; href: string };

type DreamNavOverlayProps = {
  open: boolean;
  onClose: () => void;
  /** Ref of the hamburger trigger button, so focus returns to it on close. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  items: DreamNavItem[];
  businessName: string;
  logoUrl: string;
  logoAlt: string;
  ctaLabel: string;
  ctaUrl: string;
  initialSession?: Session | null;
  accountsEnabled: boolean;
  ordersEnabled: boolean;
};

/** Milliseconds the exit fade runs before unmount. */
const EXIT_MS = 180;

/**
 * Full-screen paper overlay opened by the header hamburger (design.md
 * "Chrome › Header": "full-screen paper overlay, focus-trapped, links in
 * Italiana 34px, Estimate Quote pill pinned at the bottom, close X where
 * the hamburger was").
 *
 * Focus trap / inert-siblings / scroll-lock / escape / entrance-arming
 * mechanics structurally copied from `wealth/layout/wealth-nav-overlay.tsx`
 * (itself copied from `vii/layout/vii-header.tsx`'s mobile dialog),
 * simplified to a flat link list — dream's nav has no grouped/accordion
 * items.
 */
export function DreamNavOverlay({
  open,
  onClose,
  triggerRef,
  items,
  businessName,
  logoUrl,
  logoAlt,
  ctaLabel,
  ctaUrl,
  initialSession,
  accountsEnabled,
  ordersEnabled,
}: DreamNavOverlayProps) {
  const pathname = usePathname();
  const { data: session, isPending } = useHydratedSession(
    initialSession ?? null,
  );

  const showAdminLink =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  const isActive = (href: string) => {
    if (!href || href === "#") return false;
    return href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
  };

  // ── Presence + entrance/exit phases ────────────────────────────────────
  const [present, setPresent] = useState(open);
  const [state, setState] = useState<"enter" | "open" | "closing">("enter");

  useEffect(() => {
    if (open) {
      setPresent(true);
      setState("enter");
      return undefined;
    }
    if (wasOpenRef.current) {
      setState("closing");
      const id = setTimeout(() => setPresent(false), EXIT_MS);
      return () => clearTimeout(id);
    }
    setPresent(false);
    return undefined;
  }, [open]);

  // Arm the entrance one real frame after mount (a double-rAF races the
  // first paint and the entrance silently jumps instead).
  useLayoutEffect(() => {
    if (open && present && state === "enter") {
      dialogRef.current?.getBoundingClientRect();
      setState("open");
    }
  }, [open, present, state]);

  // ── Close on route change ──────────────────────────────────────────────
  useEffect(() => {
    if (open) onClose();
    // Only re-run when the route actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── Escape closes ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // ── Body scroll lock ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ── Focus management: move focus in on open, return it on close ───────
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      const id = setTimeout(() => closeButtonRef.current?.focus(), 0);
      return () => clearTimeout(id);
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [open, triggerRef]);

  // ── Inert siblings while open ────────────────────────────────────────────
  useEffect(() => {
    const siblings: Element[] = [];
    const header = document.querySelector("header");
    const main = document.querySelector("main");
    const footer = document.querySelector("footer");
    if (header) siblings.push(header);
    if (main) siblings.push(main);
    if (footer) siblings.push(footer);

    if (open) {
      siblings.forEach((el) => el.setAttribute("inert", ""));
    } else {
      siblings.forEach((el) => el.removeAttribute("inert"));
    }
    return () => {
      siblings.forEach((el) => el.removeAttribute("inert"));
    };
  }, [open]);

  // ── Tab focus trap ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.closest("[inert]"));
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [open]);

  if (!present) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className="dream-nav-overlay"
      data-state={state}
    >
      {/* Top bar mirrors the header for continuity: the close X sits exactly
          where the hamburger was (right), logo stays left. */}
      <div className="dream-nav-overlay-top">
        <Link
          href="/"
          onClick={onClose}
          aria-label={`${businessName} — Home`}
          className="dream-nav-overlay-line dream-nav-overlay-logo"
          style={{ "--i": 0 } as React.CSSProperties}
        >
          <img
            src={logoUrl}
            alt={logoAlt}
            className="dream-nav-overlay-logo-img"
            decoding="async"
          />
        </Link>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="dream-nav-overlay-line dream-nav-overlay-close"
          style={{ "--i": 0 } as React.CSSProperties}
        >
          <X className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      <nav className="dream-nav-overlay-nav" aria-label="Primary navigation">
        <ul className="dream-nav-overlay-list">
          {items.map((item, i) => {
            const active = isActive(item.href);
            return (
              <li key={item.href + item.label}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className="dream-nav-overlay-line dream-nav-overlay-item"
                  style={{ "--i": i + 1 } as React.CSSProperties}
                  data-active={active ? "true" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className="dream-nav-overlay-line dream-nav-overlay-bottom"
        style={{ "--i": items.length + 1 } as React.CSSProperties}
      >
        {accountsEnabled ? (
          <div className="dream-nav-overlay-account">
            {isPending ? (
              <div className="dream-nav-overlay-account-skeleton" />
            ) : session?.user ? (
              <UserButton
                size="icon"
                className="h-auto w-auto rounded-full p-0"
                avatarClassName="size-8"
                links={[
                  ...(ordersEnabled
                    ? [
                        {
                          icon: <IconPackage className="h-4 w-4" />,
                          label: "Orders",
                          href: "/account/orders",
                        },
                      ]
                    : []),
                  ...(showAdminLink
                    ? [
                        {
                          icon: <IconLayoutDashboard className="h-4 w-4" />,
                          label: "Admin",
                          href: "/admin",
                        },
                      ]
                    : []),
                ]}
              />
            ) : (
              <Link
                href="/auth/sign-in"
                onClick={onClose}
                className="dream-link"
              >
                Sign In
              </Link>
            )}
          </div>
        ) : null}
        <Link
          href={ctaUrl}
          onClick={onClose}
          className="dream-btn dream-nav-overlay-cta"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
