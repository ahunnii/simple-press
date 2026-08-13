"use client";

import type { RefObject } from "react";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

import { RelocationPillButton } from "../shared/relocation-pill-button";

export type RelocationNavLink = { href: string; label: string };

/**
 * Full-page mobile drawer (<1025px). The clone's hamburger was inert markup;
 * design.md deviation #2 makes it real. Modelled on `coop-mobile-menu.tsx`:
 * body scroll lock, `inert` on main/footer, tab focus trap, Escape + overlay
 * close, focus returned to the trigger.
 *
 * The dropdown is flattened here — Backstory / Reviews / FAQ / Services /
 * Contact Us all sit at one level, followed by the terracotta call pill.
 */
export function RelocationMobileMenu({
  open,
  onClose,
  links,
  phoneLabel,
  phoneHref,
  activePath,
  triggerRef,
  id,
  accountHref,
  accountLabel,
}: {
  open: boolean;
  onClose: () => void;
  links: RelocationNavLink[];
  phoneLabel: string;
  phoneHref: string;
  activePath: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
  id?: string;
  /**
   * A single account entry point ("Log In" / "My Account"), shown as an
   * ink-outlined pill below the phone CTA — mirrors `ViiHeader`'s mobile
   * drawer, which collapses the desktop UserButton dropdown down to one
   * link rather than trying to fit ghost buttons or an avatar menu into
   * the drawer's top bar. Omit both (or leave undefined) when
   * `customerAccounts` is off.
   */
  accountHref?: string;
  accountLabel?: string;
}) {
  const [entered, setEntered] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const generatedId = useId();
  const menuId = id ?? generatedId;

  // Fade in on the frame after mount; the CSS class owns the timing and the
  // `prefers-reduced-motion` override.
  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Make the rest of the page inert so keyboard and screen-reader users can't
  // reach content hidden behind the overlay.
  useEffect(() => {
    const siblings: Element[] = [];
    const main = document.querySelector("main");
    const footer = document.querySelector("footer");
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

  // Tab focus trap (WAI-ARIA APG modal dialog pattern).
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

  // Focus to the close button on open, back to the hamburger on close.
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

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      id={menuId}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className="relocation-mobile-menu-panel fixed inset-0 z-1010 flex flex-col bg-[var(--relocation-paper)]"
      style={{ opacity: entered ? 1 : 0 }}
    >
      <div className="flex items-center justify-end px-5 py-5">
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close navigation menu"
          className="relocation-hover-fade flex h-11 w-11 cursor-pointer items-center justify-center text-[var(--relocation-ink)]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width={22}
            height={22}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="block"
          >
            <path d="M4 4 20 20M20 4 4 20" />
          </svg>
        </button>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="flex flex-1 flex-col gap-1 overflow-auto px-8 pb-12"
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            aria-current={link.href === activePath ? "page" : undefined}
            className="relocation-hover-fade block border-b border-solid border-[var(--relocation-border)] py-4 [font-family:var(--font-relocation-display)] text-[1.5rem] leading-8 text-[var(--relocation-ink)]"
          >
            {link.label}
          </Link>
        ))}

        <div className="flex flex-col items-start gap-3 pt-8">
          <RelocationPillButton href={phoneHref} variant="solid">
            {phoneLabel}
          </RelocationPillButton>

          {accountHref && accountLabel && (
            <RelocationPillButton
              href={accountHref}
              variant="outline-light"
              className="border-[var(--relocation-ink)] text-[var(--relocation-ink)]"
            >
              {accountLabel}
            </RelocationPillButton>
          )}
        </div>
      </nav>
    </div>
  );
}
