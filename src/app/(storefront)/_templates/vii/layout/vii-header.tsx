"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@daveyplate/better-auth-ui";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { Menu, Phone, ShoppingBag, User, X } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { useCart } from "~/providers/cart-context";

import { resolveFields } from "../index";
import { ViiAnnouncementBar } from "./vii-announcement-bar";

type NavLink = { label: string; href: string };

const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

export function ViiHeader({ business, session }: DefaultHeaderTemplateProps) {
  const { itemCount } = useCart();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const mobileMenuId = useId();
  const reduced = useReducedMotion();

  // ── Scroll behavior: transparent → solid; announcement bar hides on scroll ──
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Close on route change ──────────────────────────────────────────────────
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

  // ── Nav links ──────────────────────────────────────────────────────────────
  const DEFAULT_NAV_LINKS: NavLink[] = [
    ...(isEnabled("products") ? [{ href: "/shop", label: "Shop" }] : []),
    { href: "/about", label: "About" },
    ...(isEnabled("blog") ? [{ href: "/blog", label: "Journal" }] : []),
    { href: "/contact", label: "Contact" },
  ];

  const customNav = business?.siteContent?.navigationItems as
    | NavLink[]
    | undefined;
  const links = customNav ?? DEFAULT_NAV_LINKS;
  const leftLinks = links.slice(0, Math.ceil(links.length / 2));
  const rightLinks = links.slice(Math.ceil(links.length / 2));

  // ── Resolve global + contact fields ────────────────────────────────────────
  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const g = resolveFields(customFields, [
    "vii.global.book-cta-text",
    "vii.global.book-cta-link",
    "vii.global.location-tag",
    "vii.global.announcement-text",
    "vii.global.announcement-link-text",
    "vii.global.announcement-link",
    "vii.homepage.contact-phone",
  ]);
  const bookCtaText = g["vii.global.book-cta-text"] ?? "Book Now";
  const bookCtaLink = g["vii.global.book-cta-link"] ?? "/contact";
  const locationTag = g["vii.global.location-tag"] ?? "";
  const announcementText = g["vii.global.announcement-text"] ?? "";
  const announcementLinkText = g["vii.global.announcement-link-text"] ?? "";
  const announcementLinkHref = g["vii.global.announcement-link"] ?? "/contact";
  const phone = g["vii.homepage.contact-phone"] ?? "";

  const businessName = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  const showAdminLink =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  // ── Wordmark/logo ──────────────────────────────────────────────────────────
  const renderWordmark = (dark: boolean) =>
    logoUrl ? (
      <div className="relative h-10 w-24">
        <Image
          src={logoUrl}
          alt={businessName}
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
          alignItems: "center",
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
              color: dark ? "var(--vii-ink-soft)" : "rgba(251,248,241,0.7)",
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
    fontFamily: "var(--font-sans)",
    fontSize: "12px",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    fontWeight: 400,
    textDecoration: "none",
    color: scrolled
      ? active
        ? "var(--vii-navy)"
        : "var(--vii-ink-soft)"
      : active
        ? "var(--vii-paper)"
        : "rgba(251,248,241,0.85)",
    transition: `color 0.4s ${ease}`,
    borderBottom: active ? "1px solid currentColor" : "1px solid transparent",
    paddingBottom: "2px",
    whiteSpace: "nowrap",
  });

  const iconColor = scrolled ? "var(--vii-ink-soft)" : "rgba(251,248,241,0.85)";

  return (
    <>
      <header className="fixed top-0 right-0 left-0 z-50 w-full">
        {/* ── Announcement bar — top row, hides on scroll ── */}
        {!scrolled && (
          <ViiAnnouncementBar
            businessId={business.id}
            announcementText={announcementText}
            announcementLinkText={announcementLinkText}
            announcementLinkHref={announcementLinkHref}
          />
        )}

        {/* ── Nav row ── */}
        <div
          style={{
            position: "relative",
            background: scrolled ? "var(--vii-paper)" : "transparent",
            borderBottom: scrolled
              ? "1px solid rgba(30,53,64,0.1)"
              : "1px solid transparent",
            transition: `background 0.5s ${ease}, border-color 0.5s ${ease}`,
          }}
        >
          {/* Legibility scrim behind the transparent nav (over hero media) */}
          {!scrolled && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background:
                  "linear-gradient(to bottom, rgba(30,53,64,0.5) 0%, rgba(30,53,64,0) 100%)",
              }}
            />
          )}

          <div
            className="relative mx-auto grid w-full max-w-[1440px] items-center gap-6 px-6 py-4 sm:px-8"
            style={{ gridTemplateColumns: "1fr auto 1fr" }}
          >
            {/* ── Left cell: hamburger (mobile) + left nav (desktop) ── */}
            <div className="flex items-center justify-start gap-7">
              <button
                ref={hamburgerRef}
                type="button"
                className="flex items-center justify-center md:hidden"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px 8px 8px 0",
                  color: scrolled ? "var(--vii-navy)" : "var(--vii-paper)",
                  transition: `color 0.4s ${ease}`,
                }}
                aria-label="Open menu"
                aria-expanded={mobileOpen}
                aria-controls={mobileMenuId}
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>

              <nav
                className="hidden items-center gap-7 md:flex"
                aria-label="Primary navigation"
              >
                {leftLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive(link.href) ? "page" : undefined}
                    style={navLinkStyle(isActive(link.href))}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* ── Center cell: wordmark ── */}
            <Link
              href="/"
              aria-label={`${businessName} — Home`}
              className="justify-self-center"
              style={{ flexShrink: 0 }}
            >
              {renderWordmark(scrolled)}
            </Link>

            {/* ── Right cell: right nav + account + cart + Book CTA ── */}
            <div className="flex items-center justify-end gap-5">
              <nav
                className="hidden items-center gap-7 md:flex"
                aria-label="Secondary navigation"
              >
                {rightLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive(link.href) ? "page" : undefined}
                    style={navLinkStyle(isActive(link.href))}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="hidden md:block">
                {session?.user ? (
                  <UserButton
                    size="icon"
                    classNames={{
                      trigger: {
                        base: "rounded-full w-auto h-auto p-0",
                        avatar: { base: "size-7" },
                      },
                    }}
                    additionalLinks={[
                      {
                        icon: <IconPackage className="h-4 w-4" />,
                        label: "Orders",
                        href: "/account/orders",
                      },
                      ...(showAdminLink
                        ? [
                            {
                              icon: <IconLayoutDashboard className="h-4 w-4" />,
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

              {/* Cart — link to /cart (no vii-specific drawer in this pass) */}
              <Link
                href="/cart"
                aria-label={
                  itemCount > 0
                    ? `View cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
                    : "View cart"
                }
                className="relative"
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
                    className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full font-sans text-[9px] font-semibold"
                    style={{
                      background: "var(--vii-copper)",
                      color: "var(--vii-paper)",
                      minWidth: "16px",
                      transition: reduced ? "none" : `transform 0.2s ${ease}`,
                    }}
                  >
                    {itemCount}
                  </span>
                )}
              </Link>

              {/* Book CTA — prominent copper button (desktop) */}
              <Link
                href={bookCtaLink}
                className="hidden items-center md:inline-flex"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "11px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  padding: "9px 20px",
                  background: "var(--vii-copper)",
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
                padding: "8px",
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
                background: "var(--vii-copper)",
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
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive(link.href) ? "page" : undefined}
                    style={{
                      display: "inline-block",
                      padding: "20px 0",
                      fontFamily: "var(--font-sans)",
                      fontSize: "16px",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      fontWeight: isActive(link.href) ? 600 : 300,
                      color: "var(--vii-navy)",
                      textDecoration: "none",
                      borderBottom: isActive(link.href)
                        ? "1px solid var(--vii-copper)"
                        : "1px solid transparent",
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Bottom: phone + Book CTA + account */}
          <div
            className="shrink-0 px-6 py-6"
            style={{ borderTop: "1px solid rgba(30,53,64,0.1)" }}
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
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "12px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  padding: "12px 22px",
                  background: "var(--vii-copper)",
                  color: "var(--vii-paper)",
                  textDecoration: "none",
                  borderRadius: "var(--radius)",
                  whiteSpace: "nowrap",
                }}
              >
                {bookCtaText}
              </Link>
            </div>

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
                border: "1px solid rgba(30,53,64,0.2)",
                color: "var(--vii-navy)",
                textDecoration: "none",
                borderRadius: "var(--radius)",
              }}
            >
              <User className="h-4 w-4" aria-hidden="true" />
              {session?.user ? "My Account" : "Sign In"}
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
