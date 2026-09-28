"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Heart, Phone, X } from "lucide-react";

import type { NavItem } from "~/app/(storefront)/_components/nav";
import type { Session } from "~/server/better-auth/config";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import {
  activeEntryIndex,
  externalLinkProps,
  navGroupEntries,
} from "~/app/(storefront)/_components/nav";

import { UmscButton } from "../shared/umsc-button";
import { umscTelHref } from "../shared/umsc-contact-details";
import { UmscNavDialogAccount } from "./umsc-nav-dialog-account";

type Props = {
  /** DOM id — the header's hamburger points `aria-controls` at it. */
  id: string;
  open: boolean;
  onClose: () => void;
  /** The header's nav — the same resolved, flag-filtered array. */
  links: NavItem[];
  /** Index of the current top-level item (-1: none), from the header. */
  activeIndex: number;
  businessName: string;
  brand: React.ReactNode;
  phone?: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  initialSession?: Session | null;
  accountsEnabled: boolean;
  /** Business flag check, for the account block's flag-gated links. */
  isEnabled: (flag: string) => boolean;
  /** `wishlist` storefront flag — the link is omitted entirely when off. */
  wishlistEnabled: boolean;
  wishlistCount?: number;
  /** Pinned gold pill (`umsc.global.nav-cta-*`). Empty label hides it (the
   *  header also blanks it when the URL points at a flag-disabled route). */
  ctaLabel: string;
  ctaUrl: string;
};

/** Exit duration (design.md Motion: "close reverses at 200 ms"). */
const EXIT_MS = 200;

/** Screen-reader hint on links that open in a new tab. */
function externalHint(external?: boolean) {
  return external ? <span className="sr-only"> (opens in new tab)</span> : null;
}

/**
 * UmscNavDialog — full-screen black mobile menu. Slides in from the left
 * (`.umsc-nav-dialog` keyframe in globals.css) and slides back out over
 * 200 ms on close (kept mounted until the exit ends; unmounted at once under
 * `prefers-reduced-motion`). Focus-trapped with inert siblings and a body
 * scroll lock, Marcellus 30px links, and an owner-editable gold pill
 * (`umsc.global.nav-cta-label` / `-url`, default "Custom order") pinned at
 * the bottom — cleared label hides it. An account block (sign in / account
 * links) and, when the `wishlist` flag is on, a wishlist link are pinned
 * above the phone number and CTA. Closes on route change, Escape, or the X
 * button, and returns focus to the trigger (`triggerRef`, the header's
 * hamburger button).
 *
 * A nav parent with children renders as a non-link group label with its
 * entries indented underneath (`navGroupEntries`: the parent's own href
 * first, when it has one) — never flattened, never a dead link. The group
 * that owns the current page is marked, and exactly one entry carries
 * `aria-current` (longest match).
 */
export function UmscNavDialog({
  id,
  open,
  onClose,
  links,
  activeIndex,
  businessName,
  brand,
  phone,
  triggerRef,
  initialSession,
  accountsEnabled,
  isEnabled,
  wishlistEnabled,
  wishlistCount = 0,
  ctaLabel,
  ctaUrl,
}: Props) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  // Presence: stay mounted through the exit slide after `open` flips false.
  const [present, setPresent] = useState(open);
  useEffect(() => {
    if (open) {
      setPresent(true);
      return;
    }
    const timer = setTimeout(() => setPresent(false), reduced ? 0 : EXIT_MS);
    return () => clearTimeout(timer);
  }, [open, reduced]);

  // Close on route change.
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Escape key.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Body scroll lock.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus management: move focus into the dialog on open, return it to the
  // trigger on close.
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      const timer = setTimeout(() => closeButtonRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [open, triggerRef]);

  // Inert siblings while open.
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
    return () => siblings.forEach((el) => el.removeAttribute("inert"));
  }, [open]);

  // Tab focus trap.
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
      );
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

  // Reduced motion: gone the moment `open` flips — no exit frame at all.
  if (!(open || (present && !reduced))) return null;
  const closing = !open;

  return (
    <div
      ref={dialogRef}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      aria-hidden={closing || undefined}
      inert={closing}
      className="umsc-nav-dialog fixed inset-0 z-[60] flex flex-col overflow-y-auto overscroll-contain bg-[var(--umsc-black)] max-[959px]:flex min-[960px]:hidden"
      style={
        reduced
          ? // The globals.css reduced-motion rule (`.umsc-nav-dialog`) loses
            // to `.umsc .umsc-nav-dialog` on specificity, so settle the
            // entrance here too.
            { animation: "none" }
          : closing
            ? {
                transform: "translateX(-100%)",
                transition: `transform ${EXIT_MS}ms var(--umsc-ease)`,
              }
            : undefined
      }
    >
      {/* The whole sheet scrolls as one column (the header row stays
          pinned) — an inner scroll region above a pinned account block
          clipped the last nav rows cleanly at a row boundary once the
          signed-in block grew, so the list looked like it just ended. */}
      <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between bg-[var(--umsc-black)] px-6 py-4">
        <Link href="/" onClick={onClose} aria-label={`${businessName} — Home`}>
          {brand}
        </Link>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="flex size-[44px] items-center justify-center text-[var(--umsc-cream-on-black)]"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <nav className="flex-1 px-6 py-2" aria-label="Mobile navigation">
        <ul className="flex flex-col">
          {links.map((item, i) => {
            const current = i === activeIndex;

            if (item.children?.length) {
              const entries = navGroupEntries(item);
              const activeEntry = current
                ? activeEntryIndex(pathname, entries)
                : -1;
              const labelId = `${id}-group-${i}`;
              return (
                <li
                  key={`${i}-${item.label}`}
                  className="border-b border-[var(--umsc-line-gold)]"
                >
                  <span
                    id={labelId}
                    data-current={current ? "true" : undefined}
                    className="umsc-serif block pt-5 pb-2 text-[30px] text-[var(--umsc-cream-on-black)] data-[current=true]:text-[var(--umsc-gold-soft)]"
                  >
                    {item.label}
                  </span>
                  <ul
                    aria-labelledby={labelId}
                    className="flex flex-col pb-4 pl-4"
                  >
                    {entries.map((entry, j) => (
                      <li key={`${j}-${entry.href}-${entry.label}`}>
                        <Link
                          href={entry.href}
                          {...externalLinkProps(entry.external)}
                          onClick={onClose}
                          aria-current={j === activeEntry ? "page" : undefined}
                          data-current={j === activeEntry ? "true" : undefined}
                          className="umsc-sans flex min-h-[44px] items-center gap-2 text-[14px] tracking-[0.06em] text-[var(--umsc-cream-on-black)] uppercase no-underline data-[current=true]:text-[var(--umsc-gold-soft)]"
                        >
                          <ChevronDown
                            className="size-3 -rotate-90"
                            aria-hidden="true"
                          />
                          {entry.label}
                          {externalHint(entry.external)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            }

            return (
              <li
                key={`${i}-${item.label}`}
                className="border-b border-[var(--umsc-line-gold)]"
              >
                <Link
                  href={item.href}
                  {...externalLinkProps(item.external)}
                  onClick={onClose}
                  aria-current={current ? "page" : undefined}
                  data-current={current ? "true" : undefined}
                  className="umsc-serif flex items-center justify-between py-5 text-[30px] text-[var(--umsc-cream-on-black)] no-underline data-[current=true]:text-[var(--umsc-gold-soft)]"
                >
                  {item.label}
                  {externalHint(item.external)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 px-6 py-6">
        <UmscNavDialogAccount
          initialSession={initialSession}
          accountsEnabled={accountsEnabled}
          isEnabled={isEnabled}
          onClose={onClose}
        />
        {wishlistEnabled && (
          <Link
            href="/wishlist"
            onClick={onClose}
            aria-label={
              wishlistCount > 0
                ? `View wishlist, ${wishlistCount} items`
                : "View wishlist"
            }
            className="umsc-nav-dialog-wishlist-link umsc-sans mb-2 flex min-h-[44px] items-center gap-2 text-[14px] text-[var(--umsc-cream-on-black)] no-underline"
          >
            <Heart className="size-4" strokeWidth={1.5} aria-hidden="true" />
            Wishlist
            {wishlistCount > 0 && (
              <span
                aria-hidden="true"
                className="umsc-sans flex size-4 items-center justify-center rounded-full bg-[var(--umsc-gold)] text-[9px] font-semibold text-[var(--umsc-black)]"
              >
                {wishlistCount}
              </span>
            )}
          </Link>
        )}
        {phone && (
          <a
            href={umscTelHref(phone)}
            className="umsc-sans mb-4 flex items-center gap-2 text-[14px] text-[var(--umsc-cream-on-black)] no-underline"
          >
            <Phone className="size-4" aria-hidden="true" />
            {phone}
          </a>
        )}
        {ctaLabel ? (
          <UmscButton
            as="link"
            href={ctaUrl}
            variant="gold"
            showArrow={false}
            fieldKey="umsc.global.nav-cta-label"
            className="w-full justify-center"
          >
            {ctaLabel}
          </UmscButton>
        ) : null}
      </div>
    </div>
  );
}
