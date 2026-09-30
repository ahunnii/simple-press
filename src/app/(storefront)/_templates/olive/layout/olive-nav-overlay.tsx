"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Heart, Search, X } from "lucide-react";

import type { NavItem } from "~/app/(storefront)/_components/nav";
import type { Session } from "~/server/better-auth/config";
import { cn } from "~/lib/utils";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import {
  activeEntryIndex,
  externalLinkProps,
  navGroupEntries,
} from "~/app/(storefront)/_components/nav";

import { oliveChipToken } from "../shared/olive-color";
import { OliveCartButton } from "./olive-cart-button";
import { OliveNavOverlayAccount } from "./olive-nav-overlay-account";

export type OliveNavCollection = {
  id: string;
  name: string;
  slug: string;
};

type OliveNavOverlayProps = {
  /** DOM id — the header's hamburger points `aria-controls` at it. */
  id: string;
  open: boolean;
  onClose: () => void;
  /** The hamburger that opened it, so focus goes home on close. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  /** The header's nav — the same resolved, flag-filtered array. */
  navItems: NavItem[];
  /** Index of the `/shop` item that owns the collections block (-1: none). */
  shopIndex: number;
  /** Index of the current top-level item (-1: none), from the header. */
  activeIndex: number;
  collections: OliveNavCollection[];
  businessName: string;
  logoUrl?: string | null;
  logoAlt: string;
  initialSession?: Session | null;
  accountsEnabled: boolean;
  wishlistEnabled: boolean;
  productsEnabled: boolean;
  collectionsEnabled: boolean;
  /** `cart` flag — the bag link 404s without it. */
  cartEnabled: boolean;
  /** Business flag check, for the account block's flag-gated links. */
  isEnabled: (flag: string) => boolean;
};

/** Exit duration; must match the closing transition on `.olive-nav-overlay`. */
const EXIT_MS = 240;

/**
 * Mobile navigation: ONE full-screen white card that wipes in from the left,
 * not a stack of panels. Big Josefin links, the collections listed with their
 * category chips, an Account section underneath, and the utilities (search,
 * wishlist, bag) kept along the bottom edge.
 *
 * Nav parents open as an accordion (their children indented underneath, never
 * flattened into siblings). The trigger is a button, so a group with an empty
 * href is a label rather than a dead link; a parent's own href is the first
 * entry in its list (`navGroupEntries`). The collections block belongs to the
 * `/shop` item, the same way the desktop Shop panel does.
 *
 * Focus trap, inert siblings, scroll lock and escape are structurally the
 * same mechanics as `vii/layout/vii-header.tsx`'s dialog and
 * `wealth/layout/wealth-nav-overlay.tsx`. Under reduced motion the card is
 * simply there and simply gone — no transform, no exit delay.
 */
export function OliveNavOverlay({
  id,
  open,
  onClose,
  triggerRef,
  navItems,
  shopIndex,
  activeIndex,
  collections,
  businessName,
  logoUrl,
  logoAlt,
  initialSession,
  accountsEnabled,
  wishlistEnabled,
  productsEnabled,
  collectionsEnabled,
  cartEnabled,
  isEnabled,
}: OliveNavOverlayProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  /** The one expanded accordion group, if any. */
  const [expanded, setExpanded] = useState<number | null>(null);

  // ── Presence + entrance/exit phases ─────────────────────────────────────
  const [present, setPresent] = useState(open);
  const [state, setState] = useState<"enter" | "open" | "closing">("enter");

  useEffect(() => {
    if (open) {
      setPresent(true);
      setState("enter");
      // Open on the current page's group, so it is visible without a tap.
      setExpanded(
        activeIndex !== -1 && navItems[activeIndex]?.children?.length
          ? activeIndex
          : null,
      );
      return;
    }
    if (wasOpenRef.current) {
      setState("closing");
      const timer = setTimeout(() => setPresent(false), reduced ? 0 : EXIT_MS);
      return () => clearTimeout(timer);
    }
    setPresent(false);
    // Only the open/close transition re-seeds the accordion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reduced]);

  // Arm the entrance one painted frame after the hidden state lands, so the
  // transition has a real starting point instead of jumping straight to open.
  useEffect(() => {
    if (!(open && present && state === "enter")) return;
    const frame = requestAnimationFrame(() => {
      dialogRef.current?.getBoundingClientRect();
      setState("open");
    });
    return () => cancelAnimationFrame(frame);
  }, [open, present, state]);

  // ── Close on route change ───────────────────────────────────────────────
  useEffect(() => {
    if (open) onClose();
    // Only when the route actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── Escape closes ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // ── Body scroll lock ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // ── Focus in on open, home on close ─────────────────────────────────────
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      const timer = setTimeout(() => closeButtonRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [open, triggerRef]);

  // ── Inert siblings while open ───────────────────────────────────────────
  useEffect(() => {
    const siblings: Element[] = [];
    for (const selector of ["header", "main", "footer"]) {
      const el = document.querySelector(selector);
      if (el) siblings.push(el);
    }

    if (open) {
      siblings.forEach((el) => el.setAttribute("inert", ""));
    } else {
      siblings.forEach((el) => el.removeAttribute("inert"));
    }
    return () => {
      siblings.forEach((el) => el.removeAttribute("inert"));
    };
  }, [open]);

  // ── Tab focus trap ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
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
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [open]);

  if (!present) return null;

  const showCollections =
    shopIndex !== -1 && collectionsEnabled && collections.length > 0;
  const collectionHrefs = collections.map((collection) => ({
    label: collection.name,
    href: `/collections/${collection.slug}`,
  }));
  const activeCollection = activeEntryIndex(pathname, collectionHrefs);

  return (
    <div
      ref={dialogRef}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      data-state={state}
      className="olive-nav-overlay fixed inset-0 z-[60] flex flex-col lg:hidden"
    >
      {/* Top bar mirrors the header so the card reads as the same sheet. */}
      <div
        className="flex shrink-0 items-center justify-between gap-4 px-[var(--olive-section-pad-x)]"
        style={{
          minHeight: "var(--olive-header-h)",
          borderBottom: "1px solid var(--olive-hairline)",
        }}
      >
        <Link
          href="/"
          onClick={onClose}
          aria-label={`${businessName} — Home`}
          className="flex items-center"
        >
          {logoUrl ? (
            <span className="relative block h-9 w-32">
              <Image
                src={logoUrl}
                alt={logoAlt}
                fill
                sizes="128px"
                className="object-contain object-left"
              />
            </span>
          ) : (
            <span className="olive-wordmark text-[0.8125rem]">
              {businessName}
            </span>
          )}
        </Link>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="olive-icon-btn -mr-2"
        >
          <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-[var(--olive-section-pad-x)] py-6"
        aria-label="Mobile navigation"
      >
        <ul className="m-0 flex list-none flex-col p-0">
          {navItems.map((item, index) => {
            const current = index === activeIndex;

            if (item.children?.length) {
              const isExpanded = expanded === index;
              const listId = `${id}-group-${index}`;
              const entries = navGroupEntries(item);
              const activeEntry = current
                ? activeEntryIndex(pathname, entries)
                : -1;
              return (
                <li key={`${index}-${item.label}`}>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={listId}
                    onClick={() => setExpanded(isExpanded ? null : index)}
                    data-current={current ? "true" : undefined}
                    className="olive-nav-overlay-link"
                    style={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    {item.label}
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0",
                        !reduced && "transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </button>
                  {isExpanded ? (
                    <ul
                      id={listId}
                      className="m-0 mb-3 flex list-none flex-col p-0 pl-4"
                      style={{ borderLeft: "1px solid var(--olive-hairline)" }}
                    >
                      {entries.map((entry, j) => {
                        const active = j === activeEntry;
                        return (
                          <li key={`${j}-${entry.href}-${entry.label}`}>
                            <Link
                              href={entry.href}
                              {...externalLinkProps(entry.external)}
                              onClick={onClose}
                              aria-current={active ? "page" : undefined}
                              className="olive-nav-overlay-sublink"
                              style={
                                active
                                  ? {
                                      color: "var(--olive-leaf)",
                                      fontWeight: 500,
                                    }
                                  : undefined
                              }
                            >
                              {entry.label}
                              {entry.external ? (
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

            return (
              <li key={`${index}-${item.label}`}>
                <Link
                  href={item.href}
                  {...externalLinkProps(item.external)}
                  onClick={onClose}
                  aria-current={current ? "page" : undefined}
                  data-current={current ? "true" : undefined}
                  className="olive-nav-overlay-link"
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

        {showCollections ? (
          <div
            className="mt-7 pt-7"
            style={{ borderTop: "1px solid var(--olive-hairline)" }}
          >
            <h2 className="olive-label">Collections</h2>
            <ul className="m-0 mt-3 grid list-none grid-cols-1 gap-x-6 p-0 sm:grid-cols-2">
              {collections.map((collection, index) => {
                const href = `/collections/${collection.slug}`;
                const active = index === activeCollection;
                return (
                  <li key={collection.id}>
                    <Link
                      href={href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className="olive-nav-overlay-sublink"
                    >
                      <span
                        className="olive-chip"
                        style={{
                          backgroundColor: oliveChipToken(index),
                          width: "0.875rem",
                          height: "0.875rem",
                        }}
                        aria-hidden="true"
                      />
                      {collection.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex flex-wrap gap-x-6">
              {productsEnabled ? (
                <Link
                  href="/shop"
                  onClick={onClose}
                  className="olive-btn olive-btn-ghost olive-btn-sm"
                >
                  All products
                </Link>
              ) : null}
              <Link
                href="/collections"
                onClick={onClose}
                className="olive-btn olive-btn-ghost olive-btn-sm"
              >
                All collections
              </Link>
            </div>
          </div>
        ) : null}

        {accountsEnabled ? (
          <div
            className="mt-7 pt-7"
            style={{ borderTop: "1px solid var(--olive-hairline)" }}
          >
            <h2 className="olive-label">Account</h2>
            <div className="mt-3">
              <OliveNavOverlayAccount
                initialSession={initialSession}
                accountsEnabled={accountsEnabled}
                isEnabled={isEnabled}
                onClose={onClose}
              />
            </div>
          </div>
        ) : null}
      </nav>

      {/* Bottom edge: the utilities, kept quiet under the links. */}
      <div
        className="flex shrink-0 items-center justify-end gap-3 px-[var(--olive-section-pad-x)] py-4"
        style={{ borderTop: "1px solid var(--olive-hairline)" }}
      >
        <div className="flex items-center gap-1">
          {productsEnabled ? (
            <Link
              href="/shop"
              onClick={onClose}
              className="olive-icon-btn"
              aria-label="Search products"
            >
              <Search
                className="h-[18px] w-[18px]"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </Link>
          ) : null}
          {wishlistEnabled ? (
            <Link
              href="/wishlist"
              onClick={onClose}
              className="olive-icon-btn"
              aria-label="View wishlist"
            >
              <Heart
                className="h-[18px] w-[18px]"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </Link>
          ) : null}
          {cartEnabled ? <OliveCartButton onNavigate={onClose} /> : null}
        </div>
      </div>
    </div>
  );
}
