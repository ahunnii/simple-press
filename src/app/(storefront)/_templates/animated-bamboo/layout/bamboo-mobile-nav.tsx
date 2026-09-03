"use client";

import type { CSSProperties, RefObject } from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import type { NavLink } from "./bamboo-header";

import { BambooGlyph } from "../shared/bamboo-glyph";

type BambooMobileNavProps = {
  id: string;
  open: boolean;
  onClose: () => void;
  links: NavLink[];
  isActive: (href: string) => boolean;
  /** The burger that opened the dialog — focus returns here when it closes. */
  triggerRef: RefObject<HTMLButtonElement | null>;
  businessName: string;
  phone?: string | null;
  email?: string | null;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Full-screen roll-paper menu dialog (≤900px) — `docs/templates/bamboo/design.md`
 * → Chrome → Header → "Mobile". The menu is one giant roll-paper card: a sage
 * backdrop with two drifting leaves behind, a white paper panel inset 12px
 * whose top row mirrors the header (wreath + wordmark left, 44px close circle
 * right) so the burger visually *becomes* the X, display-font pine links that
 * stagger in, and the business phone/email at the bottom when set.
 *
 * Mounted as a SIBLING of `<header>`, never inside it: the stuck header sets a
 * non-none `backdrop-filter`, which makes it the containing block for every
 * `position: fixed` descendant — a dialog nested inside would collapse to the
 * header strip the moment the page scrolls. No `createPortal` either, since
 * that would leave the `.animated-bamboo` root and with it every token this markup reads.
 *
 * All motion is CSS keyed on `data-open` (`.bamboo-menu*` in globals.css):
 * backdrop fade, panel rise, 55ms link stagger, a faster unstaggered exit, and
 * a reduced-motion block that collapses the lot. This component only toggles
 * attributes. It stays mounted while closed — `visibility: hidden` (delayed
 * until the exit finishes) plus `inert` keeps it out of the a11y tree and off
 * the tab order, which a conditional `return null` could not do without
 * cutting the exit animation short.
 */
export function BambooMobileNav({
  id,
  open,
  onClose,
  links,
  isActive,
  triggerRef,
  businessName,
  phone,
  email,
}: BambooMobileNavProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  // Body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Inert the page behind the dialog so keyboard/AT users cannot reach it.
  // Scoped to the `.animated-bamboo` root's own children rather than a document-wide
  // `main`/`footer` lookup — the editor preview can mount a second storefront.
  useEffect(() => {
    if (!open) return;
    const root = dialogRef.current?.closest(".animated-bamboo");
    if (!root) return;
    const targets = Array.from(
      root.querySelectorAll(":scope > header, :scope > main, :scope > footer"),
    );
    targets.forEach((el) => el.setAttribute("inert", ""));
    return () => {
      targets.forEach((el) => el.removeAttribute("inert"));
    };
  }, [open]);

  // Escape closes; Tab / Shift+Tab wrap inside the dialog. One listener for
  // both, so the two can never disagree about whether the dialog is open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
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
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Growing past the breakpoint hides the dialog by CSS — close it for real so
  // the scroll lock and the `inert` attributes come off with it.
  useEffect(() => {
    if (!open) return;
    const query = window.matchMedia("(min-width: 901px)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) onClose();
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [open, onClose]);

  // Focus moves to Close on open and back to the burger on close — but only
  // when the dialog was the thing that closed, never on first mount.
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      const timer = window.setTimeout(() => closeRef.current?.focus(), 0);
      return () => window.clearTimeout(timer);
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [open, triggerRef]);

  // Following a link starts a new page: clear the flag BEFORE closing so focus
  // is not yanked back to "Open menu" on arrival.
  const handleLinkClick = () => {
    wasOpenRef.current = false;
    onClose();
  };

  // Trimmed here so a whitespace-only Settings value renders nothing rather
  // than an empty `tel:`/`mailto:` link.
  const phoneText = phone?.trim();
  const emailText = email?.trim();
  const hasContactLine = [phoneText, emailText].some(Boolean);

  return (
    <div
      ref={dialogRef}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="bamboo-menu"
      data-open={open ? "true" : "false"}
      inert={open ? undefined : true}
    >
      <div
        className="bamboo-menu-backdrop"
        aria-hidden="true"
        onClick={onClose}
      >
        <span
          className="bamboo-drift"
          style={
            {
              "--l": "8%",
              "--t": "18%",
              "--w": "42px",
              "--dur": "17s",
              "--dl": "-4s",
              "--dx": "60px",
              "--dy": "180px",
              "--dr": "140deg",
            } as CSSProperties
          }
        >
          <BambooGlyph id="s-leaf" />
        </span>
        <span
          className="bamboo-drift"
          style={
            {
              "--l": "72%",
              "--t": "58%",
              "--w": "34px",
              "--dur": "20s",
              "--dl": "-11s",
              "--dx": "-80px",
              "--dy": "150px",
              "--dr": "-120deg",
            } as CSSProperties
          }
        >
          <BambooGlyph id="s-leaf-d" />
        </span>
      </div>

      <div className="bamboo-menu-panel">
        <div className="bamboo-menu-top">
          <Link
            href="/"
            onClick={handleLinkClick}
            className="inline-flex items-center gap-[11px] text-[var(--bamboo-pine)]"
            aria-label={`${businessName} — home`}
          >
            <BambooGlyph id="s-wreath" className="h-9 w-auto shrink-0" />
            <b className="font-heading text-[1.28rem] leading-none font-bold tracking-[-0.02em]">
              {businessName}
            </b>
          </Link>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="bamboo-icon-btn"
          >
            <X
              className="h-[18px] w-[18px]"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </button>
        </div>

        <nav aria-label="Mobile">
          <ul className="bamboo-menu-list">
            {links.map((link, i) => (
              <li
                key={`${link.href}-${link.label}`}
                className="bamboo-menu-item"
                style={{ "--i": i } as CSSProperties}
              >
                {link.href && link.href !== "#" ? (
                  <Link
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="bamboo-menu-link"
                    data-current={isActive(link.href) ? "true" : undefined}
                    aria-current={isActive(link.href) ? "page" : undefined}
                    onClick={handleLinkClick}
                  >
                    {link.label}
                    {link.external && (
                      <span className="sr-only"> (opens in new tab)</span>
                    )}
                  </Link>
                ) : (
                  // A heading-only nav row (no destination) — its children
                  // below carry the real links.
                  <span className="bamboo-menu-link" aria-hidden="true">
                    {link.label}
                  </span>
                )}

                {link.children?.length ? (
                  <ul className="bamboo-menu-sublist">
                    {link.children.map((child) => (
                      <li key={`${child.href}-${child.label}`}>
                        <Link
                          href={child.href}
                          target={child.external ? "_blank" : undefined}
                          rel={
                            child.external ? "noopener noreferrer" : undefined
                          }
                          className="bamboo-menu-sublink"
                          data-current={
                            isActive(child.href) ? "true" : undefined
                          }
                          aria-current={
                            isActive(child.href) ? "page" : undefined
                          }
                          onClick={handleLinkClick}
                        >
                          {child.label}
                          {child.external && (
                            <span className="sr-only"> (opens in new tab)</span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>

        {hasContactLine ? (
          <div
            className="bamboo-menu-item bamboo-menu-foot"
            style={{ "--i": links.length } as CSSProperties}
          >
            {phoneText ? (
              <a href={`tel:${phoneText.replace(/[^\d+]/g, "")}`}>
                {phoneText}
              </a>
            ) : null}
            {phoneText && emailText ? " · " : null}
            {emailText ? <a href={`mailto:${emailText}`}>{emailText}</a> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
