"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";

import type { PinkNavLink } from "./pink-header";

type PinkMobileMenuProps = {
  open: boolean;
  onClose: () => void;
  links: PinkNavLink[];
  activeHref: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
  ctaText: string;
  ctaLink: string;
  basketLabel: string;
  itemCount: number;
  onOpenCart: () => void;
  /** DOM id for the dialog panel — pass the same id used by the trigger's `aria-controls`. */
  id?: string;
};

/**
 * Full-screen ink overlay mobile nav (design.md → Chrome → Header →
 * "Mobile"). Nav items stacked at Syne 600 24px; secondary CTA + basket
 * pinned to the bottom. Focus-trapped, closes on Escape, body scroll locked
 * while open — mirrors `coop/layout/coop-mobile-menu.tsx`. Route-change
 * close is handled by the parent (`pink-header.tsx`), which owns `open`.
 */
export function PinkMobileMenu({
  open,
  onClose,
  links,
  activeHref,
  triggerRef,
  ctaText,
  ctaLink,
  basketLabel,
  itemCount,
  onOpenCart,
  id,
}: PinkMobileMenuProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

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
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelectors),
      );
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

  if (!open) return null;

  const isActive = (href: string) =>
    href === "/" ? activeHref === "/" : activeHref === href || activeHref.startsWith(`${href}/`);

  return (
    <div
      ref={dialogRef}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className="fixed inset-0 z-[70] flex flex-col lg:hidden"
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
          className="flex h-10 w-10 items-center justify-center"
          style={{ color: "var(--pink-paper)" }}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <nav
        className="flex flex-1 flex-col justify-center gap-6 overflow-y-auto px-8"
        aria-label="Mobile navigation"
      >
        {links.map((link) => (
          <Link
            key={link.href + link.label}
            href={link.href}
            onClick={onClose}
            aria-current={isActive(link.href) ? "page" : undefined}
            className="pink-display"
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: isActive(link.href) ? "var(--pink-blush)" : "var(--pink-paper)",
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div
        className="pink-dark flex flex-col gap-3 px-8 pt-6 pb-8"
        style={{ borderTop: "1px solid var(--pink-ink-line)" }}
      >
        {ctaText && (
          <Link
            href={ctaLink}
            onClick={onClose}
            className="pink-btn pink-btn-ghost w-full justify-center py-3.5"
          >
            {ctaText}
          </Link>
        )}
        <button
          type="button"
          onClick={onOpenCart}
          className="pink-btn pink-btn-solid w-full justify-center gap-2 py-3.5"
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          {basketLabel}
          {itemCount > 0 && <span style={{ opacity: 0.7 }}>({itemCount})</span>}
        </button>
      </div>
    </div>
  );
}
