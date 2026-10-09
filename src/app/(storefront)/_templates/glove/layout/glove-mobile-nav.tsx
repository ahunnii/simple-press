"use client";

import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Mail, Phone, Search, Truck, X } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { NavItem } from "~/app/(storefront)/_components/nav";
import type { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { cn } from "~/lib/utils";
import {
  activeEntryIndex,
  externalLinkProps,
  navGroupEntries,
} from "~/app/(storefront)/_components/nav";

import { GloveMobileAccount } from "./glove-mobile-account";
import {
  activeTopIndex,
  getFocusables,
  GLOVE_FALLBACK_LOGO,
} from "./glove-nav";

type HydratedSession = ReturnType<typeof useHydratedSession>["data"];

const MENU_ID = "glove-mobile-menu";
/** Exit transition length; the panel stays mounted this long after close. */
const EXIT_MS = 200;

type GloveMobileNavProps = {
  open: boolean;
  onClose: () => void;
  business: DefaultHeaderTemplateProps["business"];
  links: NavItem[];
  session: HydratedSession;
  isPending: boolean;
  isEnabled: (key: string) => boolean;
  accountsEnabled: boolean;
  accountLabel: string;
  trackLabel: string;
  trackHref: string;
  /** The burger button; focus returns here on close. */
  toggleRef: RefObject<HTMLButtonElement | null>;
};

const externalHint = <span className="sr-only"> (opens in new tab)</span>;

/**
 * Left drawer for <1024px (B3.6): focus-trapped, Esc and scrim close it,
 * scroll-locked, background inert, closes on route change. Search field on
 * top, nav (children as an accordion), account block, contact email/phone
 * and the order-tracking link.
 */
export function GloveMobileNav({
  open,
  onClose,
  business,
  links,
  session,
  isPending,
  isEnabled,
  accountsEnabled,
  accountLabel,
  trackLabel,
  trackHref,
  toggleRef,
}: GloveMobileNavProps) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const prevOpen = useRef(open);
  // True while the panel plays its exit and is still mounted but closed.
  const [exiting, setExiting] = useState(false);

  // Keep the panel mounted for the exit slide, then unmount. Reduced motion
  // (or no matchMedia) closes instantly. The scroll lock, inert background
  // and focus return all key off `open`, so they release at close start.
  useEffect(() => {
    const was = prevOpen.current;
    prevOpen.current = open;
    if (open) {
      setExiting(false);
      return;
    }
    if (!was) return;
    if (
      typeof window.matchMedia !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    setExiting(true);
    const t = setTimeout(() => setExiting(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);

  // Exit animation (Web Animations API: no stylesheet edit needed). The
  // closing panel is inert so it can't take focus or clicks while sliding.
  useEffect(() => {
    if (!exiting) return;
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    panel?.setAttribute("inert", "");
    const animations: Animation[] = [];
    const opts = {
      duration: EXIT_MS,
      easing: "ease-in",
      fill: "forwards",
    } as const;
    if (panel && typeof panel.animate === "function") {
      animations.push(
        panel.animate(
          [{ transform: "translateX(0)" }, { transform: "translateX(-100%)" }],
          opts,
        ),
      );
    }
    if (scrim && typeof scrim.animate === "function") {
      animations.push(scrim.animate([{ opacity: 1 }, { opacity: 0 }], opts));
    }
    return () => animations.forEach((a) => a.cancel());
  }, [exiting]);

  // Close on any route change (back/forward, programmatic pushes).
  const lastPathname = useRef(pathname);
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    onClose();
  }, [pathname, onClose]);

  // Crossing into desktop swaps in the desktop nav: close so the page isn't
  // left scroll-locked behind a hidden drawer.
  useEffect(() => {
    if (!open || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(min-width: 1024px)");
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

  // Scroll lock + inert background (scoped to this template's wrapper).
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    const scope: ParentNode = panelRef.current?.closest(".glove") ?? document;
    const targets = [
      scope.querySelector<HTMLElement>("#main-content"),
      scope.querySelector<HTMLElement>("footer.glove-footer"),
    ].filter((el): el is HTMLElement => !!el);
    const hadInert = targets.map((el) => el.hasAttribute("inert"));
    targets.forEach((el) => el.setAttribute("inert", ""));

    return () => {
      html.style.overflow = prevOverflow;
      targets.forEach((el, i) => {
        if (!hadInert[i]) el.removeAttribute("inert");
      });
    };
  }, [open]);

  // Focus: into the drawer on open; back to the burger on close.
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      const t = setTimeout(() => closeRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      toggleRef.current?.focus();
    }
  }, [open, toggleRef]);

  // Esc closes; Tab is trapped inside the drawer.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = getFocusables(panel);
      if (!focusables.length) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open && !exiting) return null;

  const logo = business.siteContent?.logoUrl ?? GLOVE_FALLBACK_LOGO;
  const email = business.supportEmail?.trim();
  const phone = business.phoneNumber?.trim();
  const showTrack = trackLabel.trim().length > 0;
  const activeIndex = activeTopIndex(pathname, links);

  return (
    <>
      <div
        ref={scrimRef}
        className="glove-drawer-scrim"
        onClick={onClose}
        aria-hidden="true"
        style={exiting ? { pointerEvents: "none" } : undefined}
      />
      <div
        ref={panelRef}
        id={MENU_ID}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="glove-drawer-left"
        aria-hidden={exiting ? true : undefined}
        style={exiting ? { pointerEvents: "none" } : undefined}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--glove-line)] px-4">
          <Link href="/" onClick={onClose} className="flex items-center">
            <Image
              src={logo}
              alt={resolveLogoAlt(
                business.siteContent?.logoAltText,
                business.name,
              )}
              width={120}
              height={48}
              className="h-12 w-auto object-contain"
            />
          </Link>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="-mr-2 inline-flex size-11 items-center justify-center text-[var(--glove-ink)] transition-colors hover:text-[var(--glove-primary)]"
          >
            <X className="size-6" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {isEnabled("products") ? (
            <form
              action="/shop"
              method="get"
              role="search"
              className="glove-search mb-4"
            >
              <label htmlFor="glove-drawer-search" className="sr-only">
                Search for products
              </label>
              <input
                id="glove-drawer-search"
                type="search"
                name="q"
                placeholder="Search for products"
                autoComplete="off"
              />
              <button type="submit" aria-label="Search">
                <Search className="size-5" aria-hidden="true" />
              </button>
            </form>
          ) : null}

          <nav aria-label="Mobile navigation">
            <ul className="m-0 flex list-none flex-col p-0">
              {links.map((item, i) => (
                <DrawerNavItem
                  key={i}
                  item={item}
                  index={i}
                  pathname={pathname}
                  isTopActive={i === activeIndex}
                  onClose={onClose}
                />
              ))}
            </ul>
          </nav>

          {accountsEnabled ? (
            <div className="mt-5 border-t border-[var(--glove-line)] pt-5">
              <GloveMobileAccount
                session={session}
                isPending={isPending}
                isEnabled={isEnabled}
                label={accountLabel}
                onClose={onClose}
              />
            </div>
          ) : null}

          {email || phone || showTrack ? (
            <ul className="m-0 mt-5 flex list-none flex-col gap-1 border-t border-[var(--glove-line)] p-0 pt-4 text-[14px]">
              {email ? (
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex min-h-11 items-center gap-2 text-[var(--glove-ink)] transition-colors hover:text-[var(--glove-primary)]"
                  >
                    <Mail className="size-4" aria-hidden="true" />
                    {email}
                  </a>
                </li>
              ) : null}
              {phone ? (
                <li>
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex min-h-11 items-center gap-2 text-[var(--glove-ink)] transition-colors hover:text-[var(--glove-primary)]"
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    {phone}
                  </a>
                </li>
              ) : null}
              {showTrack ? (
                <li>
                  <Link
                    href={trackHref}
                    onClick={onClose}
                    className="inline-flex min-h-11 items-center gap-2 text-[var(--glove-ink)] transition-colors hover:text-[var(--glove-primary)]"
                  >
                    <Truck className="size-4" aria-hidden="true" />
                    {trackLabel}
                  </Link>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>
    </>
  );
}

type DrawerNavItemProps = {
  item: NavItem;
  index: number;
  pathname: string;
  isTopActive: boolean;
  onClose: () => void;
};

const rowClass = (active: boolean) =>
  cn(
    "glove-display flex min-h-12 w-full items-center justify-between border-b border-[var(--glove-line)] py-2 text-left text-[15px] font-medium transition-colors",
    active
      ? "text-[var(--glove-primary)]"
      : "text-[var(--glove-nav)] hover:text-[var(--glove-primary)]",
  );

function DrawerNavItem({
  item,
  index,
  pathname,
  isTopActive,
  onClose,
}: DrawerNavItemProps) {
  const [expanded, setExpanded] = useState(
    () => !!item.children?.length && isTopActive,
  );

  if (item.children?.length) {
    const sublistId = `${MENU_ID}-group-${index}`;
    const entries = navGroupEntries(item);
    const activeEntry = isTopActive ? activeEntryIndex(pathname, entries) : -1;
    return (
      <li>
        {/* The trigger never navigates; a non-empty parent href is the first entry. */}
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={sublistId}
          onClick={() => setExpanded((e) => !e)}
          className={rowClass(isTopActive)}
        >
          {item.label}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-4 transition-transform duration-200",
              expanded && "rotate-180",
            )}
          />
        </button>
        {expanded ? (
          <ul
            id={sublistId}
            className="m-0 list-none border-b border-[var(--glove-line)] bg-[var(--glove-mist)] p-0"
          >
            {entries.map((child, j) => (
              <li key={j}>
                <Link
                  href={child.href}
                  {...externalLinkProps(child.external)}
                  aria-current={j === activeEntry ? "page" : undefined}
                  onClick={onClose}
                  className={cn(
                    "flex min-h-11 items-center py-2 pl-6 text-[14px] transition-colors",
                    j === activeEntry
                      ? "text-[var(--glove-primary)]"
                      : "text-[var(--glove-nav)] hover:text-[var(--glove-primary)]",
                  )}
                >
                  {child.label}
                  {child.external && externalHint}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href}
        {...externalLinkProps(item.external)}
        aria-current={isTopActive ? "page" : undefined}
        onClick={onClose}
        className={rowClass(isTopActive)}
      >
        {item.label}
        {item.external && externalHint}
      </Link>
    </li>
  );
}
