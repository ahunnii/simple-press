"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, X } from "lucide-react";

import type { NavItem } from "~/app/(storefront)/_components/nav";
import type { Session } from "~/server/better-auth/config";
import { isActiveNavLink } from "~/lib/nav-utils";
import { fieldAttr } from "~/lib/preview/section-attrs";
import {
  activeEntryIndex,
  externalLinkProps,
  navGroupEntries,
} from "~/app/(storefront)/_components/nav";

import { DreamSocialLinks } from "../shared/dream-social-links";
import { DreamNavOverlayAccount } from "./dream-nav-overlay-account";

type DreamNavOverlayProps = {
  open: boolean;
  onClose: () => void;
  /** Ref of the hamburger trigger button, so focus returns to it on close. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  /** The header's nav — already flag-filtered (P-NAV-FLAGS). */
  items: NavItem[];
  businessName: string;
  logoUrl: string;
  logoAlt: string;
  /** Blank label or link hides the CTA pill. */
  ctaLabel: string;
  ctaUrl: string;
  /** Raw `business.siteContent.socialLinks` JSON — parsed by `DreamSocialLinks`. */
  socialLinks: unknown;
  initialSession?: Session | null;
  accountsEnabled: boolean;
  /** Business flag check — gates the account links (Orders needs `orders`). */
  isEnabled: (flag: string) => boolean;
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
 * (itself copied from `vii/layout/vii-header.tsx`'s mobile dialog). Nav items
 * that carry children (Admin → Content → Navigation) render as an in-place
 * accordion: with a parent href the big label is a link and a separate chevron
 * button toggles the sublist (children only); with no parent href one
 * full-row button toggles it. The social row and the account list sit below
 * the link list.
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
  socialLinks,
  initialSession,
  accountsEnabled,
  isEnabled,
}: DreamNavOverlayProps) {
  const pathname = usePathname();

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  const [expanded, setExpanded] = useState<number | null>(null);

  // ── Presence + entrance/exit phases ────────────────────────────────────
  const [present, setPresent] = useState(open);
  const [state, setState] = useState<"enter" | "open" | "closing">("enter");

  useEffect(() => {
    if (open) {
      setPresent(true);
      setState("enter");
      // Every open starts with all accordions collapsed.
      setExpanded(null);
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
            if (item.children?.length) {
              const hasParentLink = !!item.href && item.href !== "#";
              const entries = navGroupEntries(item);
              const activeEntry = activeEntryIndex(pathname, entries);
              // `navGroupEntries` prepends the parent whenever its href is
              // non-empty; the sublist lists only the children.
              const childOffset = item.href ? 1 : 0;
              const groupActive = activeEntry !== -1;
              const parentActive = childOffset === 1 && activeEntry === 0;
              const isOpen = expanded === i;
              const sublistId = `dream-nav-overlay-sublist-${i}`;
              const chevron = (
                <ChevronDown
                  className={`h-6 w-6 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              );

              return (
                <li key={`${i}-${item.href}`}>
                  {hasParentLink ? (
                    <div
                      className="dream-nav-overlay-line dream-nav-overlay-row"
                      style={{ "--i": i + 1 } as React.CSSProperties}
                    >
                      <Link
                        href={item.href}
                        {...externalLinkProps(item.external)}
                        onClick={onClose}
                        aria-current={parentActive ? "page" : undefined}
                        data-active={groupActive ? "true" : undefined}
                        className="dream-nav-overlay-item"
                      >
                        {item.label}
                        {item.external ? (
                          <span className="sr-only"> (opens in new tab)</span>
                        ) : null}
                      </Link>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={sublistId}
                        aria-label={`Show ${item.label} links`}
                        onClick={() => setExpanded(isOpen ? null : i)}
                        className="dream-nav-overlay-chevron"
                        data-active={groupActive ? "true" : undefined}
                      >
                        {chevron}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={sublistId}
                      onClick={() => setExpanded(isOpen ? null : i)}
                      className="dream-nav-overlay-line dream-nav-overlay-item dream-nav-overlay-item--toggle"
                      style={{ "--i": i + 1 } as React.CSSProperties}
                      data-active={groupActive ? "true" : undefined}
                    >
                      {item.label}
                      {chevron}
                    </button>
                  )}

                  {isOpen ? (
                    <ul id={sublistId} className="dream-nav-overlay-sublist">
                      {item.children.map((child, j) => {
                        const childIsActive = j + childOffset === activeEntry;
                        return (
                          <li key={`${j}-${child.href}`}>
                            <Link
                              href={child.href}
                              {...externalLinkProps(child.external)}
                              onClick={onClose}
                              aria-current={childIsActive ? "page" : undefined}
                              data-active={childIsActive ? "true" : undefined}
                              className="dream-nav-overlay-subitem"
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
                  ) : null}
                </li>
              );
            }

            const active = isActiveNavLink(pathname, item.href);
            return (
              <li key={`${i}-${item.href}`}>
                <Link
                  href={item.href}
                  {...externalLinkProps(item.external)}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className="dream-nav-overlay-line dream-nav-overlay-item"
                  style={{ "--i": i + 1 } as React.CSSProperties}
                  data-active={active ? "true" : undefined}
                >
                  {item.label}
                  {item.external ? (
                    <span className="sr-only"> (opens in new tab)</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>

        <DreamSocialLinks
          socialLinks={socialLinks}
          className="dream-nav-overlay-line dream-nav-overlay-social"
          style={{ "--i": items.length + 1 } as React.CSSProperties}
        />

        {/* Account links scroll with the nav rather than sitting in the
            pinned footer — pinned, the account block plus CTA took ~200px
            (a third of a 667px phone) and squeezed the links into a small
            scroller. Only the CTA stays pinned. */}
        <div
          className="dream-nav-overlay-line dream-nav-overlay-account-wrap"
          style={{ "--i": items.length + 2 } as React.CSSProperties}
        >
          <DreamNavOverlayAccount
            initialSession={initialSession}
            accountsEnabled={accountsEnabled}
            isEnabled={isEnabled}
            onClose={onClose}
          />
        </div>
      </nav>

      <div
        className="dream-nav-overlay-line dream-nav-overlay-bottom"
        style={{ "--i": items.length + 3 } as React.CSSProperties}
      >
        {ctaLabel && ctaUrl ? (
          <Link
            href={ctaUrl}
            onClick={onClose}
            className="dream-btn dream-nav-overlay-cta"
            {...fieldAttr("dream.global.header-cta-label")}
          >
            {ctaLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
