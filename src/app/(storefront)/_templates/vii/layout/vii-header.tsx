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
import type { BannerConfig } from "~/lib/validators/site-banner";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { UserButton } from "~/components/auth/user/user-button";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";

import { resolveFields } from "../index";
import { ViiAnnouncementBar } from "./vii-announcement-bar";

type NavChild = { label: string; href: string; external?: boolean };
type NavLink = {
  label: string;
  href: string;
  external?: boolean;
  children?: NavChild[];
};

const ease = "var(--vii-ease-strong)";

export function ViiHeader({
  business,
  initialSession,
  banner,
}: DefaultHeaderTemplateProps & { banner?: BannerConfig | null }) {
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { data: session, isPending } = useHydratedSession(initialSession);
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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

  // ── Escape key closes any open desktop dropdown ───────────────────────────
  useEffect(() => {
    if (openDropdown === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDropdown(null);
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

  // ── Body scroll lock while mobile menu is open ────────────────────────────
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

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

  // ── Inert siblings while mobile menu is open ──────────────────────────────
  useEffect(() => {
    const siblings: Element[] = [];
    const header = document.querySelector("header");
    const main = document.querySelector("main");
    const footer = document.querySelector("footer");
    if (header) siblings.push(header);
    if (main) siblings.push(main);
    if (footer) siblings.push(footer);

    if (mobileOpen) {
      siblings.forEach((el) => el.setAttribute("inert", ""));
    } else {
      siblings.forEach((el) => el.removeAttribute("inert"));
    }
    return () => {
      siblings.forEach((el) => el.removeAttribute("inert"));
    };
  }, [mobileOpen]);

  // ── Tab focus trap ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mobileOpen) return;
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
  }, [mobileOpen]);

  const { isEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });

  const { isEnabled: isStorefrontEnabled } = useStorefrontFlags();

  // ── Nav links ──────────────────────────────────────────────────────────────
  const DEFAULT_NAV_LINKS: NavLink[] = [
    ...(isEnabled("products") ? [{ href: "/shop", label: "Shop" }] : []),
    { href: "/about", label: "About" },
    ...(isEnabled("blog") ? [{ href: "/blog", label: "Blog" }] : []),
    { href: "/contact", label: "Contact" },
  ];

  // `??`, never `||`: an owner who saves an empty item list in the Navigation
  // builder means "no nav links", which `||` would silently overwrite with the
  // shipped default.
  const customNav = business?.siteContent?.navigationItems as
    | NavLink[]
    | undefined;
  const links = customNav ?? DEFAULT_NAV_LINKS;

  // ── Resolve global fields ──────────────────────────────────────────────────
  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const g = resolveFields(customFields, [
    "vii.global.book-cta-text",
    "vii.global.book-cta-link",
    "vii.global.location-tag",
  ]);
  const bookCtaText = g["vii.global.book-cta-text"] ?? "Book Now";
  const bookCtaLink = g["vii.global.book-cta-link"] ?? "/contact";
  const locationTag = g["vii.global.location-tag"] ?? "";
  const phone = business?.phoneNumber ?? "";

  const businessName = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(
    business?.siteContent?.logoAltText,
    businessName,
  );

  const isActive = (href: string) => {
    if (!href || href === "#") return false;
    return href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
  };

  const showAdminLink =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

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
            {...fieldAttr("vii.global.location-tag")}
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

  // ── Dropdown helpers ────────────────────────────────────────────────────────
  const dropdownKey = (side: "left" | "right", index: number) =>
    `${side}-${index}`;

  const toggleMobileExpanded = (i: number) =>
    setExpandedMobile((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  // ── Desktop nav link (handles flat links + dropdowns) ───────────────────────
  const renderDesktopNavLink = (
    link: NavLink,
    index: number,
    side: "left" | "right",
  ) => {
    if (link.children?.length) {
      const key = dropdownKey(side, index);
      const isOpen = openDropdown === key;
      const childActive = !!link.children?.some((c) => isActive(c.href));
      const hasParentLink = !!link.href && link.href !== "#";

      return (
        <div
          key={link.href + link.label}
          className="relative flex items-center"
          data-vii-dropdown
          onMouseEnter={() => setOpenDropdown(key)}
          onMouseLeave={() => setOpenDropdown(null)}
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
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className="vii-nav-link"
                data-current={childActive ? "true" : undefined}
                aria-current={childActive ? "page" : undefined}
                style={navLinkStyle(childActive)}
              >
                {link.label}
                {link.external ? (
                  <span className="sr-only"> (opens in new tab)</span>
                ) : null}
              </Link>
              <button
                type="button"
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-label={`Toggle ${link.label} menu`}
                onClick={() => setOpenDropdown(isOpen ? null : key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 2px",
                  color: navLinkStyle(childActive).color,
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
              aria-haspopup="true"
              aria-expanded={isOpen}
              onClick={() => setOpenDropdown(key)}
              className="vii-nav-link"
              data-current={childActive ? "true" : undefined}
              style={{
                ...navLinkStyle(childActive),
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
                {link.children.map((child) => {
                  const childActive = isActive(child.href);
                  return (
                    <Link
                      key={child.href + child.label}
                      href={child.href}
                      target={child.external ? "_blank" : undefined}
                      rel={child.external ? "noopener noreferrer" : undefined}
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

    const active = isActive(link.href);
    return (
      <Link
        key={link.href + link.label}
        href={link.href}
        target={link.external ? "_blank" : undefined}
        rel={link.external ? "noopener noreferrer" : undefined}
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

  const renderMobileNavLink = (link: NavLink, i: number) => {
    if (link.children?.length) {
      const submenuId = `${mobileSubmenuId}-${i}`;
      const expanded = expandedMobile.has(i);
      const childActive = !!link.children?.some((c) => isActive(c.href));
      const hasParentLink = !!link.href && link.href !== "#";

      return (
        <li key={link.href + link.label}>
          {hasParentLink ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: childActive
                  ? "1px solid var(--vii-copper)"
                  : "1px solid transparent",
              }}
            >
              <Link
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                onClick={() => setMobileOpen(false)}
                aria-current={childActive ? "page" : undefined}
                style={{
                  ...mobileLinkStyle(childActive),
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
                ...mobileLinkStyle(childActive),
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                background: "transparent",
                border: "none",
                borderBottom: childActive
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
              {link.children.map((child) => {
                const childActive = isActive(child.href);
                return (
                  <li key={child.href + child.label}>
                    <Link
                      href={child.href}
                      target={child.external ? "_blank" : undefined}
                      rel={child.external ? "noopener noreferrer" : undefined}
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

    const active = isActive(link.href);
    return (
      <li key={link.href + link.label}>
        <Link
          href={link.href}
          target={link.external ? "_blank" : undefined}
          rel={link.external ? "noopener noreferrer" : undefined}
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
                {links.map((link, index) =>
                  renderDesktopNavLink(link, index, "left"),
                )}
              </nav>

              {isStorefrontEnabled("customerAccounts") && (
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
                      links={[
                        {
                          icon: <IconPackage className="h-4 w-4" />,
                          label: "Orders",
                          href: "/account/orders",
                        },
                        ...(showAdminLink
                          ? [
                              {
                                icon: (
                                  <IconLayoutDashboard className="h-4 w-4" />
                                ),
                                label: "Admin",
                                href: "/admin",
                              },
                            ]
                          : []),
                      ]}
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
              {isStorefrontEnabled("wishlist") && (
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
              {isEnabled("products") && (
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
      {mobileOpen ? (
        <div
          ref={mobileDialogRef}
          id={mobileMenuId}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-[60] flex flex-col md:hidden"
          style={{ background: "var(--vii-paper)" }}
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

          {/* Book CTA — prominent, near top */}
          <div className="shrink-0 px-6 pb-4">
            <Link
              href={bookCtaLink}
              onClick={() => setMobileOpen(false)}
              {...fieldAttr("vii.global.book-cta-text")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-sans)",
                fontSize: "12px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 500,
                padding: "14px",
                background: "var(--vii-copper-deep)",
                color: "var(--vii-paper)",
                textDecoration: "none",
                borderRadius: "var(--radius)",
              }}
            >
              {bookCtaText}
            </Link>
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

          {/* Bottom: phone + Book CTA + account */}
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

            {/* Same `customerAccounts` gate the desktop cluster uses, plus a
                pending guard: this row is a single link whose destination IS
                the session state, so rendering it early points a signed-in
                shopper at the sign-in page. A row that appears a beat late
                beats a row that goes to the wrong place. */}
            {isStorefrontEnabled("customerAccounts") && !isPending && (
              <Link
                href={session?.user ? "/account/orders" : "/auth/sign-in"}
                onClick={() => setMobileOpen(false)}
                className="mt-4 flex items-center justify-center gap-2"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "12px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 400,
                  padding: "14px",
                  background: "transparent",
                  border:
                    "1px solid color-mix(in srgb, var(--vii-navy) 20%, transparent)",
                  color: "var(--vii-navy)",
                  textDecoration: "none",
                  borderRadius: "var(--radius)",
                }}
              >
                <User className="h-4 w-4" aria-hidden="true" />
                {session?.user ? "My Account" : "Sign In"}
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
