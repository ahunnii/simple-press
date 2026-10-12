"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "~/app/(storefront)/_components/nav";
import type { ResolvedSocialLink } from "~/lib/social-links";
import type { Session } from "~/server/better-auth/config";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import {
  activeEntryIndex,
  externalLinkProps,
  isNavItemActive,
  navGroupEntries,
} from "~/app/(storefront)/_components/nav";

import { wealthLedgeButtonClasses } from "../shared/wealth-ledge-button";
import { WealthNavOverlayAccount } from "./wealth-nav-overlay-account";

/** Stable id — the header's hamburger `aria-controls` points here. */
export const WEALTH_NAV_OVERLAY_ID = "wealth-nav-overlay";

type WealthNavOverlayProps = {
  open: boolean;
  onClose: () => void;
  /** Ref of the hamburger trigger button, so focus returns to it on close. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  /** The header's resolved + flag-filtered nav (`resolveNav` →
   *  `filterNavByFlags`). Items with children render as accordions. A Home
   *  line is prepended unless the list already links to "/". */
  items: NavItem[];
  /** Donate CTA line (the header passes it when its DONATE button shows). */
  donate?: { label: string; href: string } | null;
  businessName: string;
  logoUrl?: string | null;
  logoAlt: string;
  /** `resolveSocialLinks(siteContent.socialLinks)` — icons under the links. */
  social?: ResolvedSocialLink[];
  initialSession?: Session | null;
  /** Header's flag check; gates the account block's links. */
  isEnabled: (flag: string) => boolean;
  accountsEnabled: boolean;
};

/** Milliseconds the exit fade runs before unmount (entrance is slower). */
const EXIT_MS = 180;

/**
 * Full-screen white overlay menu opened by the header hamburger — the
 * template's one authored motion moment (see design.md Motion): the field
 * fades in, then the centered italic link column arrives line-by-line with
 * a capped stagger; exit is a faster plain fade. Folder items ("+ News &
 * Resources", "+ Programs") are in-place accordions matching the live
 * Squarespace drawer; the group containing the current page starts open.
 *
 * Mechanics (focus trap, inert siblings, scroll lock, escape) structurally
 * copied from `vii/layout/vii-header.tsx`'s mobile dialog. Entrance is
 * armed one frame after mount (`data-state`) so transitions actually run;
 * `open=false` keeps the DOM for EXIT_MS to let the exit fade play.
 */
export function WealthNavOverlay({
  open,
  onClose,
  triggerRef,
  items,
  donate,
  businessName,
  logoUrl,
  logoAlt,
  social = [],
  initialSession,
  isEnabled,
  accountsEnabled,
}: WealthNavOverlayProps) {
  const pathname = usePathname();
  const { data: session, isPending } = useHydratedSession(initialSession);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const menuId = WEALTH_NAV_OVERLAY_ID;

  // The overlay is the whole menu on phones, so it keeps a Home line even
  // though the desktop nav relies on the logo.
  const lines: NavItem[] = items.some((item) => item.href === "/")
    ? items
    : [{ label: "Home", href: "/" }, ...items];

  // ── Presence + entrance/exit phases ────────────────────────────────────
  // present: DOM mounted. state: "enter" (pre-arm frame) → "open" → "closing".
  const [present, setPresent] = useState(open);
  const [state, setState] = useState<"enter" | "open" | "closing">("enter");

  useEffect(() => {
    if (open) {
      setPresent(true);
      setState("enter");
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

  // Arm the entrance: after the hidden "enter" state is in the DOM, force a
  // synchronous style/layout resolution of it, then flip to "open" — the
  // recalc gives the transition a real starting frame. (A double-rAF races
  // the first paint here and the entrance silently jumps instead.)
  useLayoutEffect(() => {
    if (open && present && state === "enter") {
      dialogRef.current?.getBoundingClientRect();
      setState("open");
    }
  }, [open, present, state]);

  // ── Accordion state: the group containing the current page starts open ──
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
  useEffect(() => {
    if (!open) return;
    const initial: Record<number, boolean> = {};
    lines.forEach((item, i) => {
      if (item.children?.length) {
        initial[i] = isNavItemActive(pathname, item);
      }
    });
    setOpenGroups(initial);
    // Recompute only when the overlay opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  let lineIndex = 0;

  return (
    <div
      ref={dialogRef}
      id={menuId}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className="wealth-nav-overlay fixed inset-0 z-[60] flex flex-col"
      data-state={state}
    >
      {/* Top bar mirrors the header for continuity: the close X sits exactly
          where the hamburger was (left), logo stays centered. */}
      <div className="wealth-container wealth-nav-overlay__bar">
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="wealth-burger wealth-nav-overlay-line"
          style={{ "--i": 0 } as React.CSSProperties}
        >
          <svg
            viewBox="0 0 26 26"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M6 6l14 14M20 6L6 20" />
          </svg>
        </button>

        <Link
          href="/"
          onClick={onClose}
          className="wealth-header__logo wealth-nav-overlay-line"
          style={{ "--i": 0 } as React.CSSProperties}
        >
          {logoUrl ? (
            <Image src={logoUrl} alt={logoAlt} fill sizes="176px" />
          ) : (
            <span className="wealth-header__logo-text">{businessName}</span>
          )}
        </Link>

        {/* Right spacer keeps the logo optically centered. */}
        <span aria-hidden="true" />
      </div>

      {/* One scroll region for nav + account: the signed-in account block can
          be tall, so it scrolls with the links instead of squeezing them. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Centered italic link column — the Squarespace drawer's voice. */}
        <nav
          className="flex flex-1 flex-col justify-center px-[var(--wealth-pad-x)] py-6 text-center"
          aria-label="Primary navigation"
        >
          <ul className="mx-auto flex w-full max-w-xl list-none flex-col p-0">
            {lines.map((item, idx) => {
              if (!item.children?.length) {
                const i = ++lineIndex;
                const active = isNavItemActive(pathname, item);
                return (
                  <li key={`${item.label}-${idx}`}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      {...externalLinkProps(item.external)}
                      aria-current={active ? "page" : undefined}
                      className="wealth-nav-overlay-line wealth-nav-overlay-item inline-block py-2"
                      style={{ "--i": i } as React.CSSProperties}
                      data-active={active ? "true" : undefined}
                    >
                      {item.label}
                      {item.external ? (
                        <>
                          {" "}
                          <span
                            className="wealth-nav-overlay__ext"
                            aria-hidden="true"
                          >
                            &#8599;
                          </span>
                          <span className="sr-only"> (opens in new tab)</span>
                        </>
                      ) : null}
                    </Link>
                  </li>
                );
              }

              const i = ++lineIndex;
              const expanded = openGroups[idx] ?? false;
              const groupId = `${menuId}-group-${idx}`;
              const groupActive = isNavItemActive(pathname, item);
              const entries = navGroupEntries(item);
              const activeEntry = activeEntryIndex(pathname, entries);
              return (
                <li key={`${item.label}-${idx}`}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((prev) => ({
                        ...prev,
                        [idx]: !expanded,
                      }))
                    }
                    aria-expanded={expanded}
                    aria-controls={groupId}
                    className="wealth-nav-overlay-line wealth-nav-overlay-item inline-block py-2"
                    style={
                      {
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        "--i": i,
                      } as React.CSSProperties
                    }
                    data-active={groupActive ? "true" : undefined}
                  >
                    <span
                      aria-hidden="true"
                      className="wealth-nav-overlay-plus"
                      data-expanded={expanded ? "true" : "false"}
                    >
                      +
                    </span>{" "}
                    {item.label}
                  </button>
                  <div
                    id={groupId}
                    className="wealth-nav-overlay-children"
                    data-expanded={expanded ? "true" : "false"}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <ul className="m-0 flex list-none flex-col p-0 pb-2">
                        {entries.map((child, j) => {
                          const active = j === activeEntry;
                          return (
                            <li key={`${child.href}-${j}`}>
                              <Link
                                href={child.href}
                                onClick={onClose}
                                {...externalLinkProps(child.external)}
                                aria-current={active ? "page" : undefined}
                                tabIndex={expanded ? undefined : -1}
                                className="wealth-nav-overlay-item wealth-nav-overlay-child inline-block py-1.5"
                                data-active={active ? "true" : undefined}
                              >
                                {child.label}
                                {child.external ? (
                                  <>
                                    {" "}
                                    <span
                                      className="wealth-nav-overlay__ext"
                                      aria-hidden="true"
                                    >
                                      &#8599;
                                    </span>
                                    <span className="sr-only">
                                      {" "}
                                      (opens in new tab)
                                    </span>
                                  </>
                                ) : null}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </li>
              );
            })}

            {donate ? (
              <li
                className="wealth-nav-overlay-line wealth-nav-overlay__donate"
                style={{ "--i": ++lineIndex } as React.CSSProperties}
              >
                <Link
                  href={donate.href}
                  onClick={onClose}
                  aria-current={pathname === donate.href ? "page" : undefined}
                  className={wealthLedgeButtonClasses({ variant: "donate" })}
                >
                  {donate.label}
                </Link>
              </li>
            ) : null}
          </ul>

          {/* Social icons, centered beneath the links like the live drawer. */}
          {social.length ? (
            <div
              className="wealth-nav-overlay-line wealth-nav-overlay__social"
              style={{ "--i": lineIndex + 1 } as React.CSSProperties}
            >
              {social.map(({ key, url, ariaLabel, Icon }) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${ariaLabel} (opens in new tab)`}
                >
                  <Icon className="h-[22px] w-[22px]" />
                </a>
              ))}
            </div>
          ) : null}
        </nav>

        {/* Bottom: account block — plain links, inside the focus trap. */}
        {accountsEnabled ? (
          <div
            className="wealth-nav-overlay-line flex shrink-0 justify-center px-[var(--wealth-pad-x)] py-5"
            style={
              {
                borderTop: "1px solid var(--wealth-surface-2)",
                "--i": lineIndex + 2,
              } as React.CSSProperties
            }
          >
            <WealthNavOverlayAccount
              session={session}
              isPending={isPending}
              isEnabled={isEnabled}
              onClose={onClose}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
