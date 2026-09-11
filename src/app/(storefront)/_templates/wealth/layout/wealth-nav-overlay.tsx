"use client";

import { useEffect, useId, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import type { Session } from "~/server/better-auth/config";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { UserButton } from "~/components/auth/user/user-button";

export type WealthNavChild = {
  label: string;
  href: string;
  external?: boolean;
};

export type WealthNavItem =
  | { type: "link"; label: string; href: string; external?: boolean }
  | { type: "group"; label: string; children: WealthNavChild[] };

type WealthNavOverlayProps = {
  open: boolean;
  onClose: () => void;
  /** Ref of the hamburger trigger button, so focus returns to it on close. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  items: WealthNavItem[];
  businessName: string;
  logoUrl?: string | null;
  logoAlt: string;
  initialSession?: Session | null;
};

/**
 * Full-screen white overlay menu opened by the header hamburger: focus
 * trapped, Escape closes, body scroll locked, quiet staggered fade-in of
 * links (`.wealth-nav-overlay-link`, gated by `data-open` — see globals.css).
 * Mechanics (focus trap, inert siblings, scroll lock, escape) structurally
 * copied from `vii/layout/vii-header.tsx`'s mobile dialog.
 */
export function WealthNavOverlay({
  open,
  onClose,
  triggerRef,
  items,
  businessName,
  logoUrl,
  logoAlt,
  initialSession,
}: WealthNavOverlayProps) {
  const pathname = usePathname();
  const { data: session, isPending } = useHydratedSession(initialSession);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const menuId = useId();

  const isActive = (href: string) => {
    if (!href || href === "#") return false;
    return href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
  };

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

  if (!open) return null;

  let linkIndex = 0;

  return (
    <div
      ref={dialogRef}
      id={menuId}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className="wealth-nav-overlay fixed inset-0 z-[60] flex flex-col"
      data-open={open ? "true" : "false"}
      style={{ background: "var(--wealth-paper)" }}
    >
      {/* Top: logo + close */}
      <div className="flex shrink-0 items-center justify-between px-6 py-5">
        <Link
          href="/"
          onClick={onClose}
          aria-label={`${businessName} — Home`}
          className="relative h-10 w-32"
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={logoAlt}
              fill
              sizes="128px"
              className="object-contain object-left"
            />
          ) : (
            <span
              style={{
                fontFamily: "var(--font-wealth-display)",
                fontStyle: "italic",
                fontSize: "20px",
                color: "var(--wealth-ink)",
              }}
            >
              {businessName}
            </span>
          )}
        </Link>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="-mr-2 flex min-h-11 min-w-11 items-center justify-center"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--wealth-ink)" }}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Nav links */}
      <nav
        className="flex flex-1 flex-col justify-center overflow-y-auto px-8 py-6"
        aria-label="Primary navigation"
      >
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            if (item.type === "link") {
              const i = linkIndex++;
              const active = isActive(item.href);
              return (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    aria-current={active ? "page" : undefined}
                    className="wealth-nav-overlay-link block py-2"
                    style={
                      {
                        fontFamily: "var(--font-wealth-display)",
                        fontSize: "clamp(28px, 5vw, 36px)",
                        color: "var(--wealth-ink)",
                        textDecoration: "none",
                        borderBottom: active
                          ? "1px solid var(--wealth-primary)"
                          : "1px solid transparent",
                        "--i": i,
                      } as React.CSSProperties
                    }
                  >
                    {item.label}
                    {item.external ? (
                      <span className="sr-only"> (opens in new tab)</span>
                    ) : null}
                  </Link>
                </li>
              );
            }

            const i = linkIndex++;
            return (
              <li key={item.label} className="pt-6 first:pt-0">
                <div
                  className="wealth-nav-overlay-link wealth-eyebrow pb-2"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  {item.label}
                </div>
                <ul className="flex flex-col gap-1">
                  {item.children.map((child) => {
                    const ci = linkIndex++;
                    const active = isActive(child.href);
                    return (
                      <li key={child.href + child.label}>
                        <Link
                          href={child.href}
                          onClick={onClose}
                          target={child.external ? "_blank" : undefined}
                          rel={
                            child.external ? "noopener noreferrer" : undefined
                          }
                          aria-current={active ? "page" : undefined}
                          className="wealth-nav-overlay-link block py-1.5"
                          style={
                            {
                              fontFamily: "var(--font-wealth-display)",
                              fontSize: "clamp(20px, 3.5vw, 26px)",
                              color: "var(--wealth-ink)",
                              textDecoration: "none",
                              borderBottom: active
                                ? "1px solid var(--wealth-primary)"
                                : "1px solid transparent",
                              "--i": ci,
                            } as React.CSSProperties
                          }
                        >
                          {child.label}
                          {child.external ? (
                            <span className="sr-only">
                              {" "}
                              (opens in new tab)
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom: quiet account row */}
      <div
        className="shrink-0 px-8 py-6"
        style={{ borderTop: "1px solid var(--wealth-surface-2)" }}
      >
        {isPending ? (
          <div
            className="h-8 w-8 animate-pulse rounded-full"
            style={{ background: "var(--wealth-surface)" }}
          />
        ) : session?.user ? (
          <UserButton
            size="icon"
            className="h-auto w-auto rounded-full p-0"
            avatarClassName="size-8"
          />
        ) : (
          <Link
            href="/auth/sign-in"
            onClick={onClose}
            className="wealth-btn-mono"
            style={{
              color: "var(--wealth-primary)",
              textDecoration: "none",
              letterSpacing: "1.9px",
            }}
          >
            Sign In
          </Link>
        )}
      </div>
    </div>
  );
}
