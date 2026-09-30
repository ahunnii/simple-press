"use client";

import type { RefObject } from "react";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Minus, Plus, ShoppingBag, X } from "lucide-react";

import type { NavItem } from "~/app/(storefront)/_components/nav";
import type { Session } from "~/server/better-auth/config";
import { cn } from "~/lib/utils";
import { externalLinkProps } from "~/app/(storefront)/_components/nav";

import { pinkNavEntries } from "./pink-nav";
import { PinkNavOverlayAccount } from "./pink-nav-overlay-account";

/** Wishlist entry data — `null` hides the row (`wishlist` flag off). */
type PinkWishlistInfo = { count: number; hydrated: boolean } | null;

/** Basket button data — `null` hides the button (`cart` flag off). */
type PinkBasketInfo = { label: string; itemCount: number } | null;

type PinkMobileMenuProps = {
  open: boolean;
  onClose: () => void;
  /** Resolved + flag-filtered nav (`resolvePinkNav`), with the header's
   *  donate CTA appended when it shows. Groups render as an accordion. */
  items: NavItem[];
  /** `pinkActiveNav(pathname, items)` — the single current entry. */
  active: { item: number; entry: number };
  triggerRef: RefObject<HTMLButtonElement | null>;
  basket: PinkBasketInfo;
  onOpenCart: () => void;
  wishlist: PinkWishlistInfo;
  /** Storefront flag check — the account block gates on it. */
  isEnabled: (flag: string) => boolean;
  initialSession?: Session | null;
  /** DOM id for the dialog panel — pass the same id used by the trigger's `aria-controls`. */
  id?: string;
};

/** Matches Tailwind's `lg` — the desktop nav takes over at this width. */
const DESKTOP_QUERY = "(min-width: 1024px)";

/** The groups that start expanded on open: the one holding the current page. */
function activeGroups(
  items: NavItem[],
  active: { item: number },
): ReadonlySet<number> {
  return active.item !== -1 && items[active.item]?.children?.length
    ? new Set([active.item])
    : new Set();
}

/**
 * Full-screen ink overlay mobile nav (design.md → Chrome → Header →
 * "Mobile"). Top-level items stack at display 600 24px; a parent with
 * children is an accordion row (+/−) whose panel lists the parent's own link
 * first, then its children, in smaller display type. Basket / wishlist /
 * account actions are pinned to the bottom.
 *
 * Stays mounted so it can fade + slide in and out (instant under reduced
 * motion via `motion-reduce` and pink's global reduced-motion block); while
 * closed it is `invisible` and `inert`, so it is out of the tab order and the
 * accessibility tree. Focus-trapped, closes on Escape, body scroll locked
 * while open — mirrors `coop/layout/coop-mobile-menu.tsx`. Route-change close
 * is handled by the parent (`pink-header.tsx`), which owns `open`.
 */
export function PinkMobileMenu({
  open,
  onClose,
  items,
  active,
  triggerRef,
  basket,
  onOpenCart,
  wishlist,
  isEnabled,
  initialSession,
  id,
}: PinkMobileMenuProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const fallbackId = useId();
  const menuId = id ?? fallbackId;

  // Accordion state: any number of groups can be open. Reset on every open
  // so the group holding the current page starts expanded (adjusting state
  // during render on a changed input, per the React docs).
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() =>
    activeGroups(items, active),
  );
  const [lastOpen, setLastOpen] = useState(open);
  if (lastOpen !== open) {
    setLastOpen(open);
    if (open) setExpanded(activeGroups(items, active));
  }

  const toggleGroup = (index: number) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Crossing into `lg` (rotation, resize) swaps in the desktop nav — close so
  // the page isn't left scroll-locked behind a menu that `lg:hidden` hides.
  useEffect(() => {
    if (!open || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(DESKTOP_QUERY);
    if (mql.matches) {
      onClose();
      return;
    }
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) onClose();
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [open, onClose]);

  // Inert the rest of the page while open (keyboard/AT users can't reach it).
  useEffect(() => {
    const siblings: Element[] = [];
    const main = document.querySelector("main");
    const footer = document.querySelector("footer");
    const announcementBar = document.querySelector("[data-announcement-bar]");
    if (main) siblings.push(main);
    if (footer) siblings.push(footer);
    if (announcementBar) siblings.push(announcementBar);

    if (open) {
      siblings.forEach((el) => el.setAttribute("inert", ""));
    } else {
      siblings.forEach((el) => el.removeAttribute("inert"));
    }
    return () => {
      siblings.forEach((el) => el.removeAttribute("inert"));
    };
  }, [open]);

  // Tab focus trap.
  useEffect(() => {
    if (!open) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusableSelectors =
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
      // Collapsed accordion panels are `hidden`; skip their links.
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelectors),
      ).filter((el) => !el.closest("[hidden]"));
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [open]);

  // Focus management: move to close button on open, return to trigger on close.
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      const t = setTimeout(() => closeButtonRef.current?.focus(), 0);
      return () => clearTimeout(t);
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [open, triggerRef]);

  // Cart, wishlist and accounts all off → no bottom stack at all (an empty
  // bordered band would be left behind otherwise).
  const hasActions =
    basket !== null || wishlist !== null || isEnabled("customerAccounts");

  const topLevelStyle = (current: boolean) => ({
    fontSize: "1.5rem",
    fontWeight: 600,
    color: current ? "var(--pink-blush)" : "var(--pink-paper)",
  });

  return (
    <div
      ref={dialogRef}
      id={menuId}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      inert={!open}
      className={cn(
        "fixed inset-0 z-[70] flex flex-col transition-[opacity,transform,visibility] duration-300 ease-[var(--pink-ease)] motion-reduce:transition-none lg:hidden",
        open
          ? "visible translate-y-0 opacity-100"
          : "pointer-events-none invisible -translate-y-2 opacity-0",
      )}
      style={{ background: "var(--pink-ink)" }}
    >
      <div
        className="flex items-center justify-end px-5 py-[18px]"
        style={{ borderBottom: "1px solid var(--pink-ink-line)" }}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close navigation menu"
          className="flex h-11 w-11 items-center justify-center"
          style={{ color: "var(--pink-paper)" }}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* `justify-center-safe`, not `justify-center`: centred while the list
          fits, but once it overflows (every group open, signed in, at 390)
          it starts at the top, so the first row stays scrollable into view
          instead of being pushed above the scroll container's start edge. */}
      <nav
        className="flex min-h-0 flex-1 flex-col justify-center-safe overflow-y-auto overscroll-contain px-8 py-8"
        aria-label="Mobile navigation"
      >
        <ul className="flex flex-col gap-4">
          {items.map((item, i) => {
            const isCurrentItem = active.item === i;

            if (item.children?.length) {
              const entries = pinkNavEntries(item);
              const isOpen = expanded.has(i);
              const panelId = `${menuId}-group-${i}`;
              return (
                <li key={i}>
                  {/* Group row — only toggles; a non-empty parent href is the
                      panel's first entry. Current styling + `data-current`,
                      but no aria-current (it isn't a page). */}
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    data-current={isCurrentItem ? "true" : undefined}
                    onClick={() => toggleGroup(i)}
                    className="pink-display flex w-full items-center justify-between gap-4 py-1.5 text-left"
                    style={topLevelStyle(isCurrentItem)}
                  >
                    {item.label}
                    {isOpen ? (
                      <Minus className="h-5 w-5 shrink-0" aria-hidden="true" />
                    ) : (
                      <Plus className="h-5 w-5 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                  <ul
                    id={panelId}
                    hidden={!isOpen}
                    className="mt-1 mb-1 flex flex-col pl-4"
                    style={{ borderLeft: "1px solid var(--pink-ink-line)" }}
                  >
                    {entries.map((entry, j) => {
                      const current = isCurrentItem && active.entry === j;
                      return (
                        <li key={j}>
                          <Link
                            href={entry.href}
                            onClick={onClose}
                            {...externalLinkProps(entry.external)}
                            aria-current={current ? "page" : undefined}
                            // `min-h-11`: a 44px touch target around the
                            // smaller 18px child type.
                            className="pink-display flex min-h-11 items-center"
                            style={{
                              fontSize: "1.125rem",
                              fontWeight: 500,
                              color: current
                                ? "var(--pink-blush)"
                                : "var(--pink-ink-muted)",
                            }}
                          >
                            {entry.label}
                            {entry.external && (
                              <span className="sr-only">
                                {" "}
                                (opens in new tab)
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            }

            return (
              <li key={i}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  {...externalLinkProps(item.external)}
                  aria-current={isCurrentItem ? "page" : undefined}
                  // `py-1.5` brings the 24px/1.5-line-height text (36px) up to
                  // a 48px hit target without changing the type scale
                  // (design.md's 24px display size) — see
                  // review-2026-07-29.md B5.
                  className="pink-display block py-1.5"
                  style={topLevelStyle(isCurrentItem)}
                >
                  {item.label}
                  {item.external && (
                    <span className="sr-only"> (opens in new tab)</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {hasActions && (
        <div
          className="pink-dark flex flex-col gap-3 px-8 pt-6 pb-8"
          style={{ borderTop: "1px solid var(--pink-ink-line)" }}
        >
          {basket && (
            <button
              type="button"
              onClick={onOpenCart}
              className="pink-btn pink-btn-solid w-full justify-center gap-2 py-3.5"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              {basket.label}
              {/* 0.85, not 0.7: white at 0.7 over the rose fill measures
                4.05:1, under AA (same fix as the header's basket count). */}
              {basket.itemCount > 0 && (
                <span style={{ opacity: 0.85 }}>({basket.itemCount})</span>
              )}
            </button>
          )}
          {wishlist && (
            <Link
              href="/wishlist"
              onClick={onClose}
              className="pink-btn pink-btn-ghost w-full justify-center gap-2 py-3.5"
            >
              <Heart className="h-4 w-4" aria-hidden="true" />
              Wishlist
              {wishlist.hydrated && wishlist.count > 0 && (
                <span style={{ opacity: 0.7 }}>({wishlist.count})</span>
              )}
            </Link>
          )}
          <PinkNavOverlayAccount
            initialSession={initialSession}
            isEnabled={isEnabled}
            onClose={onClose}
          />
        </div>
      )}
    </div>
  );
}
