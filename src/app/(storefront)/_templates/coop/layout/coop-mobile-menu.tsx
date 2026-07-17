"use client";

import type { RefObject } from "react";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

export type CoopNavLink = { href: string; label: string };

/**
 * Working mobile nav menu (clone data-cid n15–n27 is static markup; this is
 * the template's one intentional functional addition — see design.md Chrome
 * + Motion). Fade-in duration (0.525s linear) matches the clone's declared
 * but never-emitted `anim-opacity-99` keyframe timing. The overlay is a
 * full-page `--coop-color-004` dark surface (bg on the `inset-0`
 * container), with white Agdasima nav rows and a 60×60 close button
 * pinned top-right in coral rgb(238,117,81).
 */
export function CoopMobileMenu({
  open,
  onClose,
  links,
  triggerRef,
  id,
}: {
  open: boolean;
  onClose: () => void;
  links: CoopNavLink[];
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** DOM id for the dialog panel — pass the same id used by the trigger's `aria-controls`. */
  id?: string;
}) {
  const [entered, setEntered] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const generatedId = useId();
  const menuId = id ?? generatedId;

  // Fade in on the frame after mount (transition on the CSS class handles
  // the 0.525s/linear timing; `prefers-reduced-motion` disables it in CSS).
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

  // Make the rest of the page inert while the dialog is open, so keyboard
  // and screen-reader users can't reach content hidden behind the overlay
  // (matches the pattern used by the other header components' mobile
  // dialogs — noise-header.tsx, builders-header.tsx, sledge-header.tsx,
  // vii-header.tsx, pollen-header.tsx).
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

  // Tab focus trap: keep keyboard focus cycling within the dialog panel
  // while it's open (WAI-ARIA APG modal dialog pattern).
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
      ).filter((el) => !el.closest("[inert]"));
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

  // Focus management: move to the close button on open, return to the
  // hamburger trigger on close.
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

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      id={menuId}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className="coop-mobile-menu-panel fixed inset-0 z-1010 flex justify-start bg-[var(--coop-color-004)]"
      style={{ opacity: entered ? 1 : 0 }}
    >
      {/* Clone n15/n16: full-page dark overlay (bg on the inset-0 container),
          transparent 19.6875rem scroll pane inside for the white Agdasima nav
          rows, close button at the top-right corner (n25). */}
      <div className="relative h-full w-full overflow-hidden">
        <div className="h-full w-[19.6875rem] max-w-full overflow-auto p-9">
          <nav className="block" aria-label="Mobile navigation">
            {links.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                onClick={onClose}
                className="relative block cursor-pointer pb-[10.3px] text-left text-[1.0625rem] leading-[1.9375rem] tracking-[1.17px] text-[var(--coop-background)] uppercase [font-family:var(--font-coop-label)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close navigation menu"
          className="absolute top-0 right-0 z-1 flex h-15 w-15 cursor-pointer items-center justify-center p-5.5 leading-0"
        >
          {/* Sprite lines are fill="none" — they only paint via stroke. */}
          <svg
            className="block h-4 w-4 overflow-hidden"
            viewBox="0 0 16 16"
            fill="none"
            stroke="rgb(238,117,81)"
            strokeWidth={2}
            aria-hidden="true"
          >
            <use xlinkHref="/templates/coop/ui-icons.svg#close-icon" />
          </svg>
        </button>
      </div>
    </div>
  );
}
