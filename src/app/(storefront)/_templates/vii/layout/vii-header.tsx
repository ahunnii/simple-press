"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import {
  ChevronDown,
  Heart,
  Menu,
  Phone,
  ShoppingBag,
  User,
  X,
} from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { UserButtonLink } from "~/components/auth/user/user-button";
import type { BannerConfig } from "~/lib/validators/site-banner";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { UserButton } from "~/components/auth/user/user-button";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";
import {
  activeEntryIndex,
  externalLinkProps,
  filterNavByFlags,
  getAccountNavLinks,
  isNavItemActive,
  navGroupEntries,
  resolveNav,
  type NavItem,
} from "~/app/(storefront)/_components/nav";

import { resolveFields } from "../index";
import { resolveViiLocationTag } from "../shared/vii-location-tag";
import { ViiAnnouncementBar } from "./vii-announcement-bar";
import { ViiNavOverlayAccount } from "./vii-nav-overlay-account";

const ease = "var(--vii-ease-strong)";

/** Shipped default — no per-flag filtering here (PF1): `filterNavByFlags`
 *  below drops anything the business has switched off, whether it came from
 *  this list or an owner-saved one. Mirrored by `vii-footer.tsx`'s own
 *  default (same shape, its own comment). */
const DEFAULT_NAV_LINKS: NavItem[] = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

/** Desktop avatar menu + mobile overlay quick-access subset (B4.3 decision) —
 *  Orders and Admin. Settings is dropped from the desktop set because
 *  `UserButton` renders its own built-in Settings item (happy-bamboo
 *  pattern); the mobile overlay has no such built-in, so its own subset
 *  (`vii-nav-overlay-account.tsx`) keeps Settings. */
const VII_QUICK_ACCOUNT_KEYS = new Set(["orders", "admin"]);

export function ViiHeader({
  business,
  initialSession,
  banner,
}: DefaultHeaderTemplateProps & { banner?: BannerConfig | null }) {
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { data: session, isPending } = useHydratedSession(initialSession);
  const pathname = usePathname();
  const { isEnabled } = useStorefrontFlags();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileMounted, setMobileMounted] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [expandedMobile, setExpandedMobile] = useState<Set<number>>(new Set());
  const [cartBump, setCartBump] = useState(false);
  const prevItemCount = useRef(itemCount);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const mobileMenuId = useId();
  const mobileSubmenuId = useId();
  const reduced = useReducedMotion();
  // Desktop dropdown triggers (the chevron toggle button of each group), so
  // Esc can hand focus back to the control that opened the panel (PF2).
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  // Set while Esc hands focus back to a trigger, so the group's
  // open-on-focus handler doesn't immediately reopen the panel.
  const suppressFocusOpenRef = useRef(false);
  // Group opened by mouse hover: the click that usually follows the hover
  // should keep the panel open, not toggle it shut.
  const hoverOpenedRef = useRef<string | null>(null);
  const onTriggerClick = (key: string, isOpen: boolean) => {
    if (isOpen && hoverOpenedRef.current === key) {
      hoverOpenedRef.current = null;
      return;
    }
    hoverOpenedRef.current = null;
    setOpenDropdown(isOpen ? null : key);
  };

  // CIVANA-style: the transparent→solid header animation is homepage-only.
  // Every other route renders the header in its solid state from the start, so
  // nav links stay legible over light interior pages (e.g. account, shop).
  const isHomepage = pathname === "/";
  const solid = scrolled || !isHomepage;

  // ── Scroll behavior: transparent → solid; announcement bar hides on scroll ──
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Cart badge bump: pulse once when the item count goes up ────────────────
  useEffect(() => {
    if (itemCount > prevItemCount.current && !reduced) {
      setCartBump(true);
      const t = setTimeout(() => setCartBump(false), 420);
      prevItemCount.current = itemCount;
      return () => clearTimeout(t);
    }
    prevItemCount.current = itemCount;
  }, [itemCount, reduced]);

  // ── Close on route change ──────────────────────────────────────────────────
  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
    setExpandedMobile(new Set());
  }, [pathname]);

  // ── Escape key closes any open desktop dropdown, focus back to its trigger ─
  useEffect(() => {
    if (openDropdown === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const trigger = triggerRefs.current.get(openDropdown);
        setOpenDropdown(null);
        suppressFocusOpenRef.current = true;
        trigger?.focus();
        suppressFocusOpenRef.current = false;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openDropdown]);

  // ── Outside click/tap closes any open desktop dropdown ────────────────────
  useEffect(() => {
    if (openDropdown === null) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest("[data-vii-dropdown]")) setOpenDropdown(null);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [openDropdown]);

  // ── Escape key closes the mobile menu ─────────────────────────────────────
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        hamburgerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  // ── Open/close transition (PF4): mounted while opening AND while the close
  // animation plays; visible flips a frame after mount (enter) or right away
  // on close (exit), so opacity/translate can actually transition. Reduced
  // motion collapses both to an instant mount/unmount. ──────────────────────
  useEffect(() => {
    if (mobileOpen) {
      setMobileMounted(true);
      if (reduced) {
        setMobileVisible(true);
        return;
      }
      const raf = requestAnimationFrame(() => setMobileVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setMobileVisible(false);
    if (reduced) {
      setMobileMounted(false);
      return;
    }
    const t = setTimeout(() => setMobileMounted(false), 280);
    return () => clearTimeout(t);
  }, [mobileOpen, reduced]);

  // ── Body scroll lock while the mobile menu is mounted (kept through the
  // close animation, not just the logically-open window) ────────────────────
  useEffect(() => {
    if (!mobileMounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMounted]);

  // ── Focus management ───────────────────────────────────────────────────────
  useEffect(() => {
    if (mobileOpen) {
      wasOpenRef.current = true;
      const id = setTimeout(() => closeButtonRef.current?.focus(), 0);
      return () => clearTimeout(id);
    } else if (wasOpenRef.current) {
      // Only return focus when transitioning from open → closed (not on mount)
      wasOpenRef.current = false;
      hamburgerRef.current?.focus();
    }
  }, [mobileOpen]);

  // ── Inert siblings while the mobile menu is mounted ───────────────────────
  useEffect(() => {
    const siblings: Element[] = [];
    const header = document.querySelector("header");
    const main = document.querySelector("main");
    const footer = document.querySelector("footer");
    if (header) siblings.push(header);
    if (main) siblings.push(main);
    if (footer) siblings.push(footer);

    if (mobileMounted) {
      siblings.forEach((el) => el.setAttribute("inert", ""));
    } else {
      siblings.forEach((el) => el.removeAttribute("inert"));
    }
    return () => {
      siblings.forEach((el) => el.removeAttribute("inert"));
    };
  }, [mobileMounted]);

  // ── Tab focus trap ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mobileMounted) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const dialog = mobileDialogRef.current;
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
  }, [mobileMounted]);

  // ── Nav links: owner-saved (`??`, never `||` — an empty saved list means
  // "no nav links") or the shipped default, then the shared route→flag filter
  // (P-NAV-FLAGS) so a flag-disabled route never renders, from either source ─
  const links = filterNavByFlags(
    resolveNav(business?.siteContent?.navigationItems, DEFAULT_NAV_LINKS),
    isEnabled,
  );

  // ── Resolve global fields ──────────────────────────────────────────────────
  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const g = resolveFields(customFields, [
    "vii.global.book-cta-text",
    "vii.global.book-cta-link",
  ]);
  const bookCtaText = g["vii.global.book-cta-text"] ?? "Book Now";
  const bookCtaLink = g["vii.global.book-cta-link"] ?? "/contact";
  const locationTag = resolveViiLocationTag(business, customFields);
  const phone = business?.phoneNumber ?? "";

  const businessName = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(
    business?.siteContent?.logoAltText,
    businessName,
  );

  const showAdminLink =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  // Desktop avatar menu: quick-access subset (B4.3) of the same flag-gated
  // account links the mobile overlay and the account sidebar use — never a
  // hand-written list, so `orders` off correctly drops "Orders" (PF5).
  const userButtonLinks: UserButtonLink[] = getAccountNavLinks({
    isEnabled,
    includeAdmin: showAdminLink,
  })
    .filter((link) => VII_QUICK_ACCOUNT_KEYS.has(link.key))
    .map((link) => ({
      label: link.label,
      href: link.href,
      icon:
        link.key === "orders" ? (
          <IconPackage className="h-4 w-4" />
        ) : (
          <IconLayoutDashboard className="h-4 w-4" />
        ),
    }));

  // ── Wordmark/logo ──────────────────────────────────────────────────────────
  const renderWordmark = (dark: boolean) =>
    logoUrl ? (
      <div className="relative h-15 w-36">
        <Image
          src={logoUrl}
          alt={logoAlt}
          fill
          sizes="96px"
          className="object-contain"
        />
      </div>
    ) : (
      <span
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: "22px",
          fontWeight: 500,
          letterSpacing: "0.02em",
          lineHeight: 1,
          color: dark ? "var(--vii-navy)" : "var(--vii-paper)",
          transition: `color 0.4s ${ease}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <em>{businessName}</em>
        {locationTag ? (
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontStyle: "normal",
              fontSize: "9px",
              letterSpacing: "0.32em",
              fontWeight: 400,
              textTransform: "uppercase",
              color: dark
                ? "var(--vii-ink-soft)"
                : "color-mix(in srgb, var(--vii-paper) 70%, transparent)",
              marginTop: "4px",
              transition: `color 0.4s ${ease}`,
            }}
          >
            {locationTag}
          </span>
        ) : null}
      </span>
    );

  const navLinkStyle = (active: boolean): React.CSSProperties => ({
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    lineHeight: 1,
    fontFamily: "var(--font-sans)",
    fontSize: "12px",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    fontWeight: 400,
    textDecoration: "none",
    color: solid
      ? active
        ? "var(--vii-navy)"
        : "var(--vii-ink-soft)"
      : active
        ? "var(--vii-paper)"
        : "color-mix(in srgb, var(--vii-paper) 85%, transparent)",
    transition: `color 0.4s ${ease}`,
    paddingBottom: "2px",
    whiteSpace: "nowrap",
  });

  const iconColor = solid
    ? "var(--vii-ink-soft)"
    : "color-mix(in srgb, var(--vii-paper) 85%, transparent)";

  const toggleMobileExpanded = (i: number) =>
    setExpandedMobile((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  // ── Desktop nav link (handles flat links + dropdowns) ───────────────────────
  const renderDesktopNavLink = (link: NavItem, index: number) => {
    if (link.children?.length) {
      const key = `nav-${index}`;
      const isOpen = openDropdown === key;
      const hasParentLink = !!link.href && link.href !== "#";
      // Single source of truth for "which one entry is current" across the
      // parent + its children (B3.4) — avoids the old startsWith bug where a
      // parent AND a child could both look active.
      const entries = navGroupEntries(link);
      const activeIdx = activeEntryIndex(pathname, entries);
      const parentActive = hasParentLink && activeIdx === 0;
      const groupActive = activeIdx !== -1;
      const childOffset = hasParentLink ? 1 : 0;

      return (
        <div
          key={link.href + link.label}
          className="relative flex items-center"
          data-vii-dropdown
          onMouseEnter={() => {
            hoverOpenedRef.current = key;
            setOpenDropdown(key);
          }}
          onMouseLeave={() => {
            hoverOpenedRef.current = null;
            setOpenDropdown(null);
          }}
          onFocus={(e) => {
            // Open only when focus enters the group from outside it.
            if (suppressFocusOpenRef.current) return;
            if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
            setOpenDropdown(key);
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setOpenDropdown(null);
            }
          }}
        >
          {hasParentLink ? (
            <>
              <Link
                href={link.href}
                {...externalLinkProps(link.external)}
                className="vii-nav-link"
                data-current={groupActive ? "true" : undefined}
                aria-current={parentActive ? "page" : undefined}
                style={navLinkStyle(groupActive)}
              >
                {link.label}
                {link.external ? (
                  <span className="sr-only"> (opens in new tab)</span>
                ) : null}
              </Link>
              <button
                type="button"
                ref={(el) => {
                  if (el) triggerRefs.current.set(key, el);
                  else triggerRefs.current.delete(key);
                }}
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-label={`Toggle ${link.label} menu`}
                onClick={() => onTriggerClick(key, isOpen)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 2px",
                  color: navLinkStyle(groupActive).color,
                  transition: `color 0.4s ${ease}`,
                }}
              >
                <ChevronDown
                  className="h-3 w-3"
                  aria-hidden="true"
                  style={{
                    transition: reduced ? "none" : `transform 0.2s ${ease}`,
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>
            </>
          ) : (
            <button
              type="button"
              ref={(el) => {
                if (el) triggerRefs.current.set(key, el);
                else triggerRefs.current.delete(key);
              }}
              aria-haspopup="true"
              aria-expanded={isOpen}
              onClick={() => onTriggerClick(key, isOpen)}
              className="vii-nav-link"
              data-current={groupActive ? "true" : undefined}
              style={{
                ...navLinkStyle(groupActive),
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              {link.label}
              <ChevronDown
                className="h-3 w-3"
                aria-hidden="true"
                style={{
                  transition: reduced ? "none" : `transform 0.2s ${ease}`,
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>
          )}

          {isOpen ? (
            <div
              className="absolute top-full left-0 z-10"
              style={{ paddingTop: "10px" }}
            >
              <div
                style={{
                  minWidth: "200px",
                  background: "var(--vii-paper)",
                  border: "1px solid var(--vii-hairline-strong)",
                  borderRadius: "var(--radius)",
                  padding: "6px 0",
                }}
              >
                {link.children.map((child, ci) => {
                  const childActive = activeIdx === ci + childOffset;
                  return (
                    <Link
                      key={child.href + child.label}
                      href={child.href}
                      {...externalLinkProps(child.external)}
                      aria-current={childActive ? "page" : undefined}
                      onClick={() => setOpenDropdown(null)}
                      style={{
                        display: "block",
                        padding: "10px 18px",
                        fontFamily: "var(--font-sans)",
                        fontSize: "11px",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        fontWeight: childActive ? 600 : 400,
                        color: childActive
                          ? "var(--vii-copper-deep)"
                          : "var(--vii-navy)",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {child.label}
                      {child.external ? (
                        <span className="sr-only"> (opens in new tab)</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    const active = isNavItemActive(pathname, link);
    return (
      <Link
        key={link.href + link.label}
        href={link.href}
        {...externalLinkProps(link.external)}
        aria-current={active ? "page" : undefined}
        className="vii-nav-link"
        data-current={active ? "true" : undefined}
        style={navLinkStyle(active)}
      >
        {link.label}
        {link.external ? (
          <span className="sr-only"> (opens in new tab)</span>
        ) : null}
      </Link>
    );
  };

  // ── Mobile nav link (handles flat links + accordion submenus) ───────────────
  const mobileLinkStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-block",
    padding: "20px 0",
    fontFamily: "var(--font-sans)",
    fontSize: "16px",
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    fontWeight: active ? 600 : 300,
    color: "var(--vii-navy)",
    textDecoration: "none",
    borderBottom: active
      ? "1px solid var(--vii-copper)"
      : "1px solid transparent",
  });

  const renderMobileNavLink = (link: NavItem, i: number) => {
    if (link.children?.length) {
      const submenuId = `${mobileSubmenuId}-${i}`;
      const expanded = expandedMobile.has(i);
      const hasParentLink = !!link.href && link.href !== "#";
      const entries = navGroupEntries(link);
      const activeIdx = activeEntryIndex(pathname, entries);
      const groupActive = activeIdx !== -1;
      const childOffset = hasParentLink ? 1 : 0;

      return (
        <li key={link.href + link.label}>
          {hasParentLink ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: groupActive
                  ? "1px solid var(--vii-copper)"
                  : "1px solid transparent",
              }}
            >
              <Link
                href={link.href}
                {...externalLinkProps(link.external)}
                onClick={() => setMobileOpen(false)}
                aria-current={activeIdx === 0 ? "page" : undefined}
                style={{
                  ...mobileLinkStyle(groupActive),
                  borderBottom: "none",
                  flex: 1,
                }}
              >
                {link.label}
                {link.external ? (
                  <span className="sr-only"> (opens in new tab)</span>
                ) : null}
              </Link>
              <button
                type="button"
                onClick={() => toggleMobileExpanded(i)}
                aria-expanded={expanded}
                aria-controls={submenuId}
                aria-label={`Toggle ${link.label} menu`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--vii-navy)",
                  padding: "10px 0 10px 12px",
                  minWidth: "44px",
                  minHeight: "44px",
                }}
              >
                <ChevronDown
                  className="h-5 w-5 shrink-0"
                  aria-hidden="true"
                  style={{
                    transition: reduced ? "none" : `transform 0.2s ${ease}`,
                    transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => toggleMobileExpanded(i)}
              aria-expanded={expanded}
              aria-controls={submenuId}
              style={{
                ...mobileLinkStyle(groupActive),
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                background: "transparent",
                border: "none",
                borderBottom: groupActive
                  ? "1px solid var(--vii-copper)"
                  : "1px solid transparent",
                cursor: "pointer",
              }}
            >
              {link.label}
              <ChevronDown
                className="h-5 w-5 shrink-0"
                aria-hidden="true"
                style={{
                  transition: reduced ? "none" : `transform 0.2s ${ease}`,
                  transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>
          )}
          {expanded ? (
            <ul id={submenuId} className="flex flex-col pb-2 pl-4">
              {link.children.map((child, ci) => {
                const childActive = activeIdx === ci + childOffset;
                return (
                  <li key={child.href + child.label}>
                    <Link
                      href={child.href}
                      {...externalLinkProps(child.external)}
                      onClick={() => setMobileOpen(false)}
                      aria-current={childActive ? "page" : undefined}
                      style={{
                        display: "inline-block",
                        padding: "14px 0",
                        fontFamily: "var(--font-sans)",
                        fontSize: "13px",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        fontWeight: childActive ? 600 : 300,
                        color: childActive
                          ? "var(--vii-copper-deep)"
                          : "var(--vii-navy)",
                        textDecoration: "none",
                      }}
                    >
                      {child.label}
                      {child.external ? (
                        <span className="sr-only"> (opens in new tab)</span>
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

    const active = isNavItemActive(pathname, link);
    return (
      <li key={link.href + link.label}>
        <Link
          href={link.href}
          {...externalLinkProps(link.external)}
          onClick={() => setMobileOpen(false)}
          aria-current={active ? "page" : undefined}
          style={mobileLinkStyle(active)}
        >
          {link.label}
          {link.external ? (
            <span className="sr-only"> (opens in new tab)</span>
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <>
      <header
        className="fixed top-0 right-0 left-0 z-50 w-full"
        {...sectionGroupAttr("global", "branding")}
      >
        {/* ── Announcement bar — top row, hides on scroll ── */}
        {!scrolled && banner && <ViiAnnouncementBar banner={banner} />}

        {/* ── Nav row ── */}
        <div
          style={{
            position: "relative",
            background: solid ? "var(--vii-paper)" : "transparent",
            borderBottom: solid
              ? "1px solid color-mix(in srgb, var(--vii-navy) 10%, transparent)"
              : "1px solid transparent",
            transition: `background 0.5s ${ease}, border-color 0.5s ${ease}`,
          }}
        >
          {/* Legibility scrim behind the transparent nav (over hero media) */}
          {!solid && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background:
                  "linear-gradient(to bottom, color-mix(in srgb, var(--vii-navy) 50%, transparent) 0%, color-mix(in srgb, var(--vii-navy) 0%, transparent) 100%)",
              }}
            />
          )}

          <div
            className="relative mx-auto flex w-full max-w-[1440px] items-center justify-between gap-6 px-6 sm:px-8"
            style={{
              paddingTop: solid ? "14px" : "22px",
              paddingBottom: solid ? "14px" : "22px",
              transition: reduced ? "none" : `padding 0.5s ${ease}`,
            }}
          >
            {/* ── Left: hamburger (mobile) + wordmark ── */}
            <div className="flex items-center gap-3">
              <button
                ref={hamburgerRef}
                type="button"
                className="flex items-center justify-center md:hidden"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px 8px 8px 0",
                  color: solid ? "var(--vii-navy)" : "var(--vii-paper)",
                  transition: `color 0.4s ${ease}`,
                }}
                aria-label="Open menu"
                aria-expanded={mobileOpen}
                aria-controls={mobileMenuId}
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>

              <Link
                href="/"
                aria-label={`${businessName} — Home`}
                style={{
                  flexShrink: 0,
                  transformOrigin: "left center",
                  transform: solid ? "scale(0.94)" : "scale(1)",
                  transition: reduced ? "none" : `transform 0.5s ${ease}`,
                }}
              >
                {renderWordmark(solid)}
              </Link>
            </div>

            {/* ── Right: primary nav + account + cart + Book CTA ── */}
            <div className="flex items-center justify-end gap-5">
              <nav
                className="mr-2 hidden items-center gap-7 md:flex"
                aria-label="Primary navigation"
              >
                {links.map((link, index) => renderDesktopNavLink(link, index))}
              </nav>

              {isEnabled("customerAccounts") && (
                <div className="hidden md:block">
                  {isPending ? (
                    <div
                      className="h-7 w-7 animate-pulse rounded-full"
                      style={{
                        background: solid
                          ? "color-mix(in srgb, var(--vii-navy) 15%, transparent)"
                          : "color-mix(in srgb, var(--vii-paper) 25%, transparent)",
                      }}
                    />
                  ) : session?.user ? (
                    <UserButton
                      size="icon"
                      className="h-auto w-auto rounded-full p-0"
                      avatarClassName="size-7 ring-1 ring-[var(--vii-copper)] ring-offset-1 ring-offset-transparent"
                      links={userButtonLinks}
                    />
                  ) : (
                    <Link
                      href="/auth/sign-in"
                      aria-label="Sign in to your account"
                      className="-m-2 flex items-center justify-center p-2"
                      style={{
                        color: iconColor,
                        transition: `color 0.4s ${ease}`,
                      }}
                    >
                      <User
                        className="h-[18px] w-[18px]"
                        strokeWidth={1.4}
                        aria-hidden="true"
                      />
                    </Link>
                  )}
                </div>
              )}

              {/* Wishlist — static badge (no bump animation) */}
              {isEnabled("wishlist") && (
                <Link
                  href="/wishlist"
                  aria-label={
                    wishlistCount > 0
                      ? `View wishlist, ${wishlistCount} ${wishlistCount === 1 ? "item" : "items"}`
                      : "View wishlist"
                  }
                  className="relative -m-2 flex items-center justify-center p-2"
                  style={{ color: iconColor, transition: `color 0.4s ${ease}` }}
                >
                  <Heart
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.4}
                    aria-hidden="true"
                  />
                  {wishlistCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full font-sans text-[9px] font-semibold"
                      style={{
                        background: "var(--vii-copper-deep)",
                        color: "var(--vii-paper)",
                        minWidth: "16px",
                      }}
                    >
                      {wishlistCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Cart — link to /cart (no vii-specific drawer in this pass) */}
              {isEnabled("cart") && (
                <Link
                  href="/cart"
                  aria-label={
                    itemCount > 0
                      ? `View cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
                      : "View cart"
                  }
                  className="relative -m-2 flex items-center justify-center p-2"
                  style={{ color: iconColor, transition: `color 0.4s ${ease}` }}
                >
                  <ShoppingBag
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.4}
                    aria-hidden="true"
                  />
                  {itemCount > 0 && (
                    <span
                      aria-hidden="true"
                      data-vii-pulse=""
                      className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full font-sans text-[9px] font-semibold"
                      style={{
                        background: "var(--vii-copper-deep)",
                        color: "var(--vii-paper)",
                        minWidth: "16px",
                        animation: cartBump
                          ? "vii-pulse 0.42s var(--vii-ease)"
                          : "none",
                      }}
                    >
                      {itemCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Book CTA — prominent copper button (desktop) */}
              <Link
                href={bookCtaLink}
                {...fieldAttr("vii.global.book-cta-text")}
                className="hidden items-center md:inline-flex"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "11px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  padding: "9px 20px",
                  background: "var(--vii-copper-deep)",
                  color: "var(--vii-paper)",
                  textDecoration: "none",
                  borderRadius: "var(--radius)",
                  whiteSpace: "nowrap",
                  transition: `opacity 0.2s ${ease}`,
                }}
              >
                {bookCtaText}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile navigation menu (CIVANA-style) ───────────────────────────── */}
      {mobileMounted ? (
        <div
          ref={mobileDialogRef}
          id={mobileMenuId}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-[60] flex flex-col md:hidden"
          style={{
            background: "var(--vii-paper)",
            opacity: mobileVisible ? 1 : 0,
            transform: mobileVisible ? "translateY(0)" : "translateY(-12px)",
            transition: reduced
              ? "none"
              : `opacity 0.28s ${ease}, transform 0.28s ${ease}`,
          }}
        >
          {/* Top: logo + close */}
          <div className="flex shrink-0 items-center justify-between px-6 py-4">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              aria-label={`${businessName} — Home`}
            >
              {renderWordmark(true)}
            </Link>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--vii-navy)",
                minWidth: 44,
                minHeight: 44,
                marginRight: -4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Nav links */}
          <nav
            className="flex-1 overflow-y-auto px-6 py-4"
            aria-label="Mobile navigation"
          >
            <ul className="flex flex-col">
              {links.map((link, i) => renderMobileNavLink(link, i))}
            </ul>
          </nav>

          {/* Bottom: phone + Book CTA + account. The single "Book Now" CTA in
              the open menu lives here (PF25 — the full-width one that used to
              sit above the nav links was dropped). */}
          <div
            className="shrink-0 px-6 py-6"
            style={{
              borderTop:
                "1px solid color-mix(in srgb, var(--vii-navy) 10%, transparent)",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              {phone ? (
                <a
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    letterSpacing: "0.04em",
                    color: "var(--vii-navy)",
                    textDecoration: "none",
                  }}
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {phone}
                </a>
              ) : (
                <span />
              )}

              <Link
                href={bookCtaLink}
                onClick={() => setMobileOpen(false)}
                {...fieldAttr("vii.global.book-cta-text")}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "12px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  padding: "12px 22px",
                  background: "var(--vii-copper-deep)",
                  color: "var(--vii-paper)",
                  textDecoration: "none",
                  borderRadius: "var(--radius)",
                  whiteSpace: "nowrap",
                }}
              >
                {bookCtaText}
              </Link>
            </div>

            {/* Account block (PF6) — full link list + sign-out, never
                `UserButton` (its Radix portal would render under this
                overlay and outside its focus trap). Handles its own pending
                state, so it never flashes "Sign In" for a signed-in shopper. */}
            {isEnabled("customerAccounts") && (
              <div className="mt-5">
                <ViiNavOverlayAccount
                  session={session}
                  isPending={isPending}
                  isEnabled={isEnabled}
                  onClose={() => setMobileOpen(false)}
                />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
