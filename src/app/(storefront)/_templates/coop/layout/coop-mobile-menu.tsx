"use client";

import type { RefObject } from "react";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

export type CoopNavLink = { href: string; label: string };

/**
 * Working mobile nav menu (clone data-cid n15–n27 is static markup; this is
 * the template's one intentional functional addition — see design.md Chrome
 * + Motion). Fade-in duration (0.525s linear) matches the clone's declared
 * but never-emitted `anim-opacity-99` keyframe timing. The panel dims are
 * transcribed verbatim: 23.4375rem wide, `--coop-color-004` background,
 * Agdasima nav rows, 60×60 close button.
 */
export function CoopMobileMenu({
  open,
  onClose,
  links,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  links: CoopNavLink[];
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const [entered, setEntered] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const menuId = useId();

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
      id={menuId}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className="coop-mobile-menu-panel fixed inset-0 z-1010 flex justify-start"
      style={{ opacity: entered ? 1 : 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Clone n15/n16: 23.4375rem dark overlay anchored LEFT, transparent
          19.6875rem scroll pane inside, close button at the overlay's right
          edge (n25). */}
      <div className="relative h-full w-[23.4375rem] max-w-full overflow-hidden bg-[var(--coop-color-004)]">
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
          <svg
            className="block h-4 w-4 overflow-hidden"
            viewBox="0 0 16 16"
            fill="var(--coop-background)"
            aria-hidden="true"
          >
            <use xlinkHref="/templates/coop/ui-icons.svg#close-icon" />
          </svg>
        </button>
      </div>
    </div>
  );
}
