"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Phone, X } from "lucide-react";

import type { UmscNavLink } from "./umsc-header";

import { UmscButton } from "../shared/umsc-button";

type Props = {
  open: boolean;
  onClose: () => void;
  links: UmscNavLink[];
  businessName: string;
  brand: React.ReactNode;
  phone?: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
};

/**
 * UmscNavDialog — full-screen black mobile menu. Slides in from the right
 * (`.umsc-nav-dialog` in globals.css), focus-trapped with inert siblings and
 * a body scroll lock, Marcellus 30px links, and a gold pill "Custom order"
 * pinned at the bottom. Closes on route change, Escape, or the X button, and
 * returns focus to the trigger (`triggerRef`, the header's hamburger button).
 */
export function UmscNavDialog({
  open,
  onClose,
  links,
  businessName,
  brand,
  phone,
  triggerRef,
}: Props) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const menuId = useId();

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
      const id = setTimeout(() => closeButtonRef.current?.focus(), 0);
      return () => clearTimeout(id);
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

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      id={menuId}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className="umsc-nav-dialog fixed inset-0 z-[60] flex flex-col bg-[var(--umsc-black)] max-[959px]:flex min-[960px]:hidden"
    >
      <div className="flex shrink-0 items-center justify-between px-6 py-4">
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

      <nav
        className="flex-1 overflow-y-auto px-6 py-2"
        aria-label="Mobile navigation"
      >
        <ul className="flex flex-col">
          {links.map((link) => (
            <li
              key={link.href + link.label}
              className="border-b border-[var(--umsc-line-gold)]"
            >
              <Link
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                onClick={onClose}
                className="umsc-serif flex items-center justify-between py-5 text-[30px] text-[var(--umsc-cream-on-black)] no-underline"
              >
                {link.label}
                {link.external && (
                  <span className="sr-only"> (opens in new tab)</span>
                )}
              </Link>
              {link.children?.length ? (
                <ul className="flex flex-col gap-1 pb-4 pl-4">
                  {link.children.map((child) => (
                    <li key={child.href + child.label}>
                      <Link
                        href={child.href}
                        onClick={onClose}
                        className="umsc-sans flex items-center gap-2 py-2 text-[14px] tracking-[0.06em] text-[var(--umsc-cream-on-black)] uppercase no-underline"
                      >
                        <ChevronDown
                          className="size-3 -rotate-90"
                          aria-hidden="true"
                        />
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </nav>

      <div className="shrink-0 px-6 py-6">
        {phone && (
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="umsc-sans mb-4 flex items-center gap-2 text-[14px] text-[var(--umsc-cream-on-black)] no-underline"
          >
            <Phone className="size-4" aria-hidden="true" />
            {phone}
          </a>
        )}
        <UmscButton
          as="link"
          href="/contact?type=custom"
          variant="gold"
          showArrow={false}
          className="w-full justify-center"
        >
          Custom order
        </UmscButton>
      </div>
    </div>
  );
}
